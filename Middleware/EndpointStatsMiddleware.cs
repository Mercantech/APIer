using Microsoft.AspNetCore.Routing;
using OpgaverAPI.Services;

namespace OpgaverAPI.Middleware
{
    /// <summary>
    /// Tæller alle matched API-routes automatisk (inkl. fremtidige controllers).
    /// </summary>
    public sealed class EndpointStatsMiddleware
    {
        private readonly RequestDelegate _next;

        private static readonly HashSet<string> SkipPrefixes = new(StringComparer.OrdinalIgnoreCase)
        {
            "/swagger",
            "/favicon.ico"
        };

        public EndpointStatsMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context, IEndpointStatsService stats)
        {
            await _next(context);

            var path = context.Request.Path.Value ?? "/";
            if (ShouldSkip(path)) return;

            // Kun track matched endpoints (ikke 404 til ukendte paths uden route)
            var endpoint = context.GetEndpoint();
            if (endpoint is null) return;

            var template = (endpoint as RouteEndpoint)?.RoutePattern?.RawText;
            var trackPath = string.IsNullOrWhiteSpace(template)
                ? path
                : EndpointStatsService.NormalizePath(template);

            // Controllers uden leading slash i pattern
            trackPath = EndpointStatsService.NormalizePath(trackPath);

            stats.Track(context.Request.Method, trackPath);
        }

        private static bool ShouldSkip(string path)
        {
            foreach (var prefix in SkipPrefixes)
            {
                if (path.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                    return true;
            }

            // Stats-læsning skal ikke tælle sig selv som "trafik"
            if (path.Equals("/Opgaver/Stats", StringComparison.OrdinalIgnoreCase))
                return true;

            return false;
        }
    }
}
