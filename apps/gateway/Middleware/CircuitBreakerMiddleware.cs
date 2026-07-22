namespace OmniGateway.Middleware;

/// <summary>
/// Simple in-memory circuit breaker per upstream URL.
/// Opens after N failures within a window, resets after timeout.
/// </summary>
public class CircuitBreakerMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<CircuitBreakerMiddleware> _log;

    // Shared state: upstream -> (failureCount, lastFailureTime, isOpen)
    private static readonly Dictionary<string, CircuitState> _circuits = new();
    private static readonly object _lock = new();

    private const int FailureThreshold = 5;
    private static readonly TimeSpan ResetTimeout = TimeSpan.FromSeconds(30);

    public CircuitBreakerMiddleware(RequestDelegate next, ILogger<CircuitBreakerMiddleware> log)
    {
        _next = next;
        _log = log;
    }

    public async Task InvokeAsync(HttpContext ctx)
    {
        // Circuit breaker is applied at the service level, not per-request here
        // This middleware logs open circuits for observability
        lock (_lock)
        {
            foreach (var (url, state) in _circuits)
            {
                if (state.IsOpen && DateTime.UtcNow - state.LastFailure > ResetTimeout)
                {
                    _log.LogInformation("Circuit for {Url} half-open after reset timeout", url);
                    state.IsOpen = false;
                    state.FailureCount = 0;
                }
            }
        }
        await _next(ctx);
    }

    public static void RecordFailure(string upstream)
    {
        lock (_lock)
        {
            if (!_circuits.TryGetValue(upstream, out var state))
                _circuits[upstream] = state = new CircuitState();

            state.FailureCount++;
            state.LastFailure = DateTime.UtcNow;
            if (state.FailureCount >= FailureThreshold)
                state.IsOpen = true;
        }
    }

    public static bool IsOpen(string upstream)
    {
        lock (_lock)
        {
            if (!_circuits.TryGetValue(upstream, out var state)) return false;
            if (state.IsOpen && DateTime.UtcNow - state.LastFailure > ResetTimeout)
            {
                state.IsOpen = false;
                state.FailureCount = 0;
            }
            return state.IsOpen;
        }
    }

    private class CircuitState
    {
        public int FailureCount { get; set; }
        public DateTime LastFailure { get; set; }
        public bool IsOpen { get; set; }
    }
}
