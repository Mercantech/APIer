using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using OpgaverAPI.Context;
using OpgaverAPI.Models;

namespace OpgaverAPI.Services
{
    /// <summary>
    /// Henter manglende champion-billeder (samme visuelle assets som
    /// leagueoflegends.com/champions) via Community Dragon og gemmer i S3/MinIO.
    /// </summary>
    public class ChampionImageSyncService
    {
        private const string SummaryUrl =
            "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-summary.json";

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

        private sealed record CdragonChamp(int Id, string Name, string Alias);

        public async Task<SyncResult> SyncMissingAsync(bool force = false, CancellationToken ct = default)
        {
            if (!_storage.IsConfigured)
                throw new InvalidOperationException("S3 er ikke konfigureret");

            await _storage.EnsureBucketAsync(ct);

            var http = _httpFactory.CreateClient("ddragon");
            using var summaryRes = await http.GetAsync(SummaryUrl, ct);
            summaryRes.EnsureSuccessStatusCode();
            await using var summaryStream = await summaryRes.Content.ReadAsStreamAsync(ct);
            using var summaryDoc = await JsonDocument.ParseAsync(summaryStream, cancellationToken: ct);

            var byName = new Dictionary<string, CdragonChamp>(StringComparer.OrdinalIgnoreCase);
            foreach (var el in summaryDoc.RootElement.EnumerateArray())
            {
                var id = el.GetProperty("id").GetInt32();
                if (id <= 0) continue;
                var name = el.GetProperty("name").GetString() ?? "";
                var alias = el.GetProperty("alias").GetString() ?? name;
                if (string.IsNullOrWhiteSpace(alias)) continue;
                var entry = new CdragonChamp(id, name, alias);
                byName[name] = entry;
                byName[alias] = entry;
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

                if (!force && hasLocal)
                {
                    skipped++;
                    continue;
                }

                if (!TryResolve(champ, byName, out var meta))
                {
                    _log.LogWarning("Ingen Community Dragon-match for champion {Name} ({Id})", champ.Name, champ.Id);
                    failed++;
                    continue;
                }

                var objectKey = $"lol/champions/{meta.Alias}.png";
                var publicUrl = _storage.PublicUrl(objectKey);

                try
                {
                    var already = await _storage.ExistsAsync(objectKey, ct);
                    if (!already || force)
                    {
                        // Square portrait — samme type ikon som på LoL champion-listen
                        var candidates = new[]
                        {
                            $"https://cdn.communitydragon.org/latest/champion/{meta.Alias}/square",
                            $"https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/{meta.Id}.png",
                        };

                        byte[]? bytes = null;
                        foreach (var imgUrl in candidates)
                        {
                            using var imgRes = await http.GetAsync(imgUrl, ct);
                            if (!imgRes.IsSuccessStatusCode) continue;
                            bytes = await imgRes.Content.ReadAsByteArrayAsync(ct);
                            break;
                        }

                        if (bytes == null || bytes.Length == 0)
                        {
                            _log.LogWarning("Download fejlede for {Alias}", meta.Alias);
                            failed++;
                            continue;
                        }

                        await using var ms = new MemoryStream(bytes);
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

            return new SyncResult(champions.Count, uploaded, updated, skipped, failed, "communitydragon-latest");
        }

        private static bool TryResolve(
            LolChampion champ,
            Dictionary<string, CdragonChamp> byName,
            out CdragonChamp meta)
        {
            meta = new CdragonChamp(0, "", "");
            if (!string.IsNullOrWhiteSpace(champ.Name) && byName.TryGetValue(champ.Name.Trim(), out var byDisplay))
            {
                meta = byDisplay;
                return true;
            }

            if (!string.IsNullOrWhiteSpace(champ.Id) && byName.TryGetValue(champ.Id.Trim(), out var byId))
            {
                meta = byId;
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
            var force = _cfg.GetValue("S3:ForceSyncOnStartup", false);
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
                    var result = await svc.SyncMissingAsync(force: force, cancellationToken);
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
