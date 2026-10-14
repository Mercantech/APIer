using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using OpgaverAPI.Context;
using OpgaverAPI.Models;

namespace OpgaverAPI.Services
{
    /// <summary>
    /// Henter manglende champion-billeder fra Riot Data Dragon
    /// (samme CDN som leagueoflegends.com/champions) og gemmer i S3/MinIO.
    /// </summary>
    public class ChampionImageSyncService
    {
        private readonly AppDBContext _db;
        private readonly ObjectStorageService _storage;
        private readonly IHttpClientFactory _httpFactory;
        private readonly ILogger<ChampionImageSyncService> _log;

        public ChampionImageSyncService(
            AppDBContext db,
            ObjectStorageService storage,
            IHttpClientFactory httpFactory,
            ILogger<ChampionImageSyncService> log)
        {
            _db = db;
            _storage = storage;
            _httpFactory = httpFactory;
            _log = log;
        }

        public record SyncResult(int Checked, int Uploaded, int Updated, int Skipped, int Failed, string? Version);

        public async Task<SyncResult> SyncMissingAsync(bool force = false, CancellationToken ct = default)
        {
            if (!_storage.IsConfigured)
                throw new InvalidOperationException("S3 er ikke konfigureret");

            var http = _httpFactory.CreateClient("ddragon");
            var versionsJson = await http.GetStringAsync("https://ddragon.leagueoflegends.com/api/versions.json", ct);
            using var versionsDoc = JsonDocument.Parse(versionsJson);
            var version = versionsDoc.RootElement[0].GetString()
                ?? throw new InvalidOperationException("Kunne ikke læse Data Dragon-version");

            var champJson = await http.GetStringAsync(
                $"https://ddragon.leagueoflegends.com/cdn/{version}/data/en_US/champion.json",
                ct);
            using var champDoc = JsonDocument.Parse(champJson);

            var byName = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (var prop in champDoc.RootElement.GetProperty("data").EnumerateObject())
            {
                var id = prop.Name;
                var name = prop.Value.GetProperty("name").GetString() ?? id;
                byName[name] = id;
                byName[id] = id;
            }

            var champions = await _db.Champions.ToListAsync(ct);
            var uploaded = 0;
            var updated = 0;
            var skipped = 0;
            var failed = 0;

            foreach (var champ in champions)
            {
                ct.ThrowIfCancellationRequested();
                var missing = string.IsNullOrWhiteSpace(champ.ImgUrl);
                var hasLocal = !missing
                    && champ.ImgUrl!.StartsWith("/assets/", StringComparison.OrdinalIgnoreCase);

                // Default: manglende eller ikke-lokale URL'er. force=true gen-downloader alt.
                if (!force && hasLocal)
                {
                    skipped++;
                    continue;
                }

                if (!TryResolveDdragonId(champ, byName, out var ddragonId))
                {
                    _log.LogWarning("Ingen Data Dragon-id for champion {Name} ({Id})", champ.Name, champ.Id);
                    failed++;
                    continue;
                }

                var objectKey = $"lol/champions/{ddragonId}.png";
                var publicUrl = _storage.PublicUrl(objectKey);

                try
                {
                    var already = await _storage.ExistsAsync(objectKey, ct);
                    if (!already || force)
                    {
                        // Square icon fra Data Dragon — samme CDN som leagueoflegends.com bruger
                        var imgUrl =
                            $"https://ddragon.leagueoflegends.com/cdn/{version}/img/champion/{ddragonId}.png";
                        using var imgRes = await http.GetAsync(imgUrl, ct);
                        if (!imgRes.IsSuccessStatusCode)
                        {
                            _log.LogWarning("Download fejlede {Status} for {Id}", imgRes.StatusCode, ddragonId);
                            failed++;
                            continue;
                        }

                        await using var stream = await imgRes.Content.ReadAsStreamAsync(ct);
                        await using var ms = new MemoryStream();
                        await stream.CopyToAsync(ms, ct);
                        ms.Position = 0;
                        await _storage.PutAsync(objectKey, ms, "image/png", ct);
                        uploaded++;
                    }

                    if (!string.Equals(champ.ImgUrl, publicUrl, StringComparison.Ordinal))
                    {
                        champ.ImgUrl = publicUrl;
                        champ.UpdatedAt = DateTime.UtcNow;
                        updated++;
                    }
                }
                catch (Exception ex)
                {
                    _log.LogError(ex, "Sync fejlede for {Name}", champ.Name);
                    failed++;
                }
            }

            if (updated > 0)
                await _db.SaveChangesAsync(ct);

            return new SyncResult(champions.Count, uploaded, updated, skipped, failed, version);
        }

        private static bool TryResolveDdragonId(
            LolChampion champ,
            Dictionary<string, string> byName,
            out string ddragonId)
        {
            ddragonId = "";
            if (!string.IsNullOrWhiteSpace(champ.Name) && byName.TryGetValue(champ.Name.Trim(), out var byDisplay))
            {
                ddragonId = byDisplay;
                return true;
            }

            // Id kan allerede være ddragon-id (Aatrox) eller slug
            if (!string.IsNullOrWhiteSpace(champ.Id) && byName.TryGetValue(champ.Id.Trim(), out var byId))
            {
                ddragonId = byId;
                return true;
            }

            return false;
        }
    }

    /// <summary>Kører image-sync én gang efter opstart, hvis S3 er konfigureret.</summary>
    public class ChampionImageSyncHostedService : IHostedService
    {
        private readonly IServiceProvider _sp;
        private readonly IConfiguration _cfg;
        private readonly ILogger<ChampionImageSyncHostedService> _log;

        public ChampionImageSyncHostedService(
            IServiceProvider sp,
            IConfiguration cfg,
            ILogger<ChampionImageSyncHostedService> log)
        {
            _sp = sp;
            _cfg = cfg;
            _log = log;
        }

        public Task StartAsync(CancellationToken cancellationToken)
        {
            var sync = _cfg.GetValue("S3:SyncChampionsOnStartup", true);
            var enabled = !string.IsNullOrWhiteSpace(_cfg["S3:ServiceUrl"]);
            if (!sync || !enabled)
                return Task.CompletedTask;

            _ = Task.Run(async () =>
            {
                try
                {
                    await Task.Delay(TimeSpan.FromSeconds(8), cancellationToken);
                    using var scope = _sp.CreateScope();
                    var svc = scope.ServiceProvider.GetRequiredService<ChampionImageSyncService>();
                    var result = await svc.SyncMissingAsync(force: false, cancellationToken);
                    _log.LogInformation(
                        "Champion image sync: checked={Checked} uploaded={Uploaded} updated={Updated} skipped={Skipped} failed={Failed} version={Version}",
                        result.Checked,
                        result.Uploaded,
                        result.Updated,
                        result.Skipped,
                        result.Failed,
                        result.Version);
                }
                catch (Exception ex)
                {
                    _log.LogError(ex, "Champion image sync fejlede ved opstart");
                }
            }, cancellationToken);

            return Task.CompletedTask;
        }

        public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
    }
}
