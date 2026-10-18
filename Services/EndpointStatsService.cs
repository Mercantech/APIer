using System.Collections.Concurrent;
using Microsoft.EntityFrameworkCore;
using OpgaverAPI.Context;
using OpgaverAPI.Models;

namespace OpgaverAPI.Services
{
    /// <summary>
    /// Hybrid: ConcurrentDictionary til live-inkrement, Postgres til persistens mellem deploys.
    /// </summary>
    public sealed class EndpointStatsService : IEndpointStatsService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<EndpointStatsService> _logger;
        private readonly ConcurrentDictionary<string, Entry> _entries = new(StringComparer.OrdinalIgnoreCase);

        private sealed class Entry
        {
            public long Total;
            public long Pending;
            public long LastCalledTicks; // UTC ticks, 0 = never
        }

        public EndpointStatsService(IServiceScopeFactory scopeFactory, ILogger<EndpointStatsService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        private static string Key(string method, string path) =>
            $"{method.ToUpperInvariant()} {NormalizePath(path)}";

        public static string NormalizePath(string path)
        {
            if (string.IsNullOrWhiteSpace(path)) return "/";
            path = path.Trim();
            if (!path.StartsWith('/')) path = "/" + path;
            if (path.Length > 1 && path.EndsWith('/')) path = path.TrimEnd('/');
            return path;
        }

        public void Track(string method, string path)
        {
            var key = Key(method, path);
            var entry = _entries.GetOrAdd(key, _ => new Entry());
            Interlocked.Increment(ref entry.Total);
            Interlocked.Increment(ref entry.Pending);
            Interlocked.Exchange(ref entry.LastCalledTicks, DateTime.UtcNow.Ticks);
        }

        public long GetCalls(string method, string path)
        {
            if (_entries.TryGetValue(Key(method, path), out var e))
                return Interlocked.Read(ref e.Total);
            return 0;
        }

        public IReadOnlyList<EndpointStatRow> GetSnapshot()
        {
            return _entries
                .Select(kv =>
                {
                    var parts = kv.Key.Split(' ', 2);
                    var method = parts[0];
                    var path = parts.Length > 1 ? parts[1] : "/";
                    var ticks = Interlocked.Read(ref kv.Value.LastCalledTicks);
                    DateTime? last = ticks > 0 ? new DateTime(ticks, DateTimeKind.Utc) : null;
                    return new EndpointStatRow(method, path, Interlocked.Read(ref kv.Value.Total), last);
                })
                .OrderByDescending(r => r.Calls)
                .ThenBy(r => r.Path, StringComparer.OrdinalIgnoreCase)
                .ToList();
        }

        public async Task LoadFromDatabaseAsync(CancellationToken ct = default)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDBContext>();
                var rows = await db.EndpointCallStats.AsNoTracking().ToListAsync(ct);
                foreach (var row in rows)
                {
                    var key = Key(row.Method, row.Path);
                    _entries.AddOrUpdate(
                        key,
                        _ => new Entry
                        {
                            Total = row.CallCount,
                            Pending = 0,
                            LastCalledTicks = row.LastCalledAt?.Ticks ?? 0
                        },
                        (_, existing) =>
                        {
                            // Behold live-pending; sæt baseline til max(db, current)
                            var live = Interlocked.Read(ref existing.Total);
                            if (row.CallCount > live)
                            {
                                Interlocked.Exchange(ref existing.Total, row.CallCount);
                            }
                            if (row.LastCalledAt is { } at && at.Ticks > Interlocked.Read(ref existing.LastCalledTicks))
                            {
                                Interlocked.Exchange(ref existing.LastCalledTicks, at.Ticks);
                            }
                            return existing;
                        });
                }

                _logger.LogInformation("Endpoint-stats loaded from Postgres ({Count} routes)", rows.Count);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Kunne ikke loade endpoint-stats fra DB — kører med tom hukommelse");
            }
        }

        public async Task FlushAsync(CancellationToken ct = default)
        {
            var dirty = new List<(string Method, string Path, long Delta, DateTime? Last)>();
            foreach (var kv in _entries)
            {
                var delta = Interlocked.Exchange(ref kv.Value.Pending, 0);
                if (delta <= 0) continue;
                var parts = kv.Key.Split(' ', 2);
                var method = parts[0];
                var path = parts.Length > 1 ? parts[1] : "/";
                var ticks = Interlocked.Read(ref kv.Value.LastCalledTicks);
                dirty.Add((method, path, delta, ticks > 0 ? new DateTime(ticks, DateTimeKind.Utc) : null));
            }

            if (dirty.Count == 0) return;

            try
            {
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDBContext>();

                foreach (var (method, path, delta, last) in dirty)
                {
                    var row = await db.EndpointCallStats
                        .FirstOrDefaultAsync(x => x.Method == method && x.Path == path, ct);

                    if (row is null)
                    {
                        db.EndpointCallStats.Add(new EndpointCallStat
                        {
                            Method = method,
                            Path = path,
                            CallCount = delta,
                            LastCalledAt = last,
                            UpdatedAt = DateTime.UtcNow
                        });
                    }
                    else
                    {
                        row.CallCount += delta;
                        if (last is { } l && (row.LastCalledAt is null || l > row.LastCalledAt))
                            row.LastCalledAt = l;
                        row.UpdatedAt = DateTime.UtcNow;
                    }
                }

                await db.SaveChangesAsync(ct);
            }
            catch (Exception ex)
            {
                // Læg delta tilbage så vi ikke mister tal ved midlertidig DB-fejl
                foreach (var (method, path, delta, _) in dirty)
                {
                    if (_entries.TryGetValue(Key(method, path), out var e))
                        Interlocked.Add(ref e.Pending, delta);
                }
                _logger.LogWarning(ex, "Endpoint-stats flush fejlede — pending genindsat");
            }
        }
    }
}
