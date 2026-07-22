namespace OmniGateway.Services;

/// <summary>
/// Structured telemetry logger: records request/response metrics
/// to a rolling JSONL file for observability.
/// </summary>
public class TelemetryLogger
{
    private readonly string _logPath;
    private readonly SemaphoreSlim _lock = new(1, 1);
    private readonly ILogger<TelemetryLogger> _log;

    public TelemetryLogger(ILogger<TelemetryLogger> log)
    {
        _log = log;
        _logPath = Path.Combine("logs", "requests.jsonl");
        Directory.CreateDirectory("logs");
    }

    public async Task LogRequestAsync(string path, int statusCode, string upstream, long durationMs)
    {
        var entry = System.Text.Json.JsonSerializer.Serialize(new
        {
            ts = DateTimeOffset.UtcNow,
            path,
            statusCode,
            upstream,
            durationMs
        });

        await _lock.WaitAsync();
        try
        {
            await File.AppendAllTextAsync(_logPath, entry + "\n");
        }
        finally
        {
            _lock.Release();
        }
    }
}
