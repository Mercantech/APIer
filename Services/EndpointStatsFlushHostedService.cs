namespace OpgaverAPI.Services
{
    /// <summary>
    /// Flusher hukommelses-deltas til Postgres med jævne mellemrum og ved shutdown.
    /// </summary>
    public sealed class EndpointStatsFlushHostedService : BackgroundService
    {
        private readonly IEndpointStatsService _stats;
        private readonly ILogger<EndpointStatsFlushHostedService> _logger;
        private readonly TimeSpan _interval = TimeSpan.FromSeconds(5);

        public EndpointStatsFlushHostedService(
            IEndpointStatsService stats,
            ILogger<EndpointStatsFlushHostedService> logger)
        {
            _stats = stats;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            await _stats.LoadFromDatabaseAsync(stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await Task.Delay(_interval, stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    break;
                }

                try
                {
                    await _stats.FlushAsync(CancellationToken.None);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Periodisk stats-flush fejlede");
                }
            }
        }

        public override async Task StopAsync(CancellationToken cancellationToken)
        {
            try
            {
                await _stats.FlushAsync(CancellationToken.None);
                _logger.LogInformation("Endpoint-stats flushed ved shutdown");
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Shutdown-flush af endpoint-stats fejlede");
            }

            await base.StopAsync(cancellationToken);
        }
    }
}
