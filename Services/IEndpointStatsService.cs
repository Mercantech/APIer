namespace OpgaverAPI.Services
{
    public sealed record EndpointStatRow(
        string Method,
        string Path,
        long Calls,
        DateTime? LastCalledAt);

    public interface IEndpointStatsService
    {
        void Track(string method, string path);
        IReadOnlyList<EndpointStatRow> GetSnapshot();
        long GetCalls(string method, string path);
        Task LoadFromDatabaseAsync(CancellationToken ct = default);
        Task FlushAsync(CancellationToken ct = default);
    }
}
