namespace OmniGateway.Services;

/// <summary>
/// Manages a pool of API keys across multiple providers,
/// rotating them on 429/401 responses. Thread-safe via Interlocked.
/// </summary>
public class KeyRotationService
{
    private readonly List<string> _keys = new();
    private int _index = -1;
    private readonly ILogger<KeyRotationService> _log;

    public KeyRotationService(ILogger<KeyRotationService> log, IConfiguration cfg)
    {
        _log = log;
        LoadKeys(cfg);
    }

    private void LoadKeys(IConfiguration cfg)
    {
        // Load from env vars — supports comma-separated lists per provider
        var providers = new[] { "ANTHROPIC_API_KEY", "OPENROUTER_API_KEY", "GEMINI_API_KEY" };
        foreach (var envVar in providers)
        {
            var val = Environment.GetEnvironmentVariable(envVar) ?? cfg[envVar];
            if (string.IsNullOrWhiteSpace(val)) continue;
            foreach (var key in val.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            {
                if (!string.IsNullOrEmpty(key))
                    _keys.Add(key);
            }
        }
        _log.LogInformation("KeyRotationService loaded {Count} API keys", _keys.Count);
    }

    /// <summary>Gets the next key in round-robin order. Returns empty string if no keys loaded.</summary>
    public string GetNextKey()
    {
        if (_keys.Count == 0) return string.Empty;
        var idx = (int)(Interlocked.Increment(ref _index) % _keys.Count);
        if (idx < 0) idx = 0;
        return _keys[idx];
    }

    public int KeyCount => _keys.Count;
}
