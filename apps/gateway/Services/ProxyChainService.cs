namespace OmniGateway.Services;

public class ProxyChainService
{
    private readonly IHttpClientFactory _http;
    private readonly KeyRotationService _keys;
    private readonly ILogger<ProxyChainService> _log;
    private readonly string[] _chain;

    public ProxyChainService(
        IHttpClientFactory http,
        KeyRotationService keys,
        ILogger<ProxyChainService> log,
        IConfiguration cfg)
    {
        _http = http;
        _keys = keys;
        _log = log;

        _chain = new[]
        {
            $"http://localhost:{cfg["ROTATO_PORT"] ?? "8990"}",
            $"http://localhost:{cfg["CRUISE_PORT"] ?? "4141"}",
            $"http://localhost:{cfg["MOA_AGGREGATOR_PORT"] ?? "8007"}"
        };
    }

    public async Task<IResult> ForwardAsync(HttpContext ctx)
    {
        using var reader = new StreamReader(ctx.Request.Body);
        var body = await reader.ReadToEndAsync();
        var client = _http.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(90);

        foreach (var upstream in _chain)
        {
            try
            {
                var request = new HttpRequestMessage(HttpMethod.Post, $"{upstream}{ctx.Request.Path}")
                {
                    Content = new StringContent(body, System.Text.Encoding.UTF8, "application/json")
                };

                // Forward safe headers only
                foreach (var h in ctx.Request.Headers)
                {
                    if (h.Key.StartsWith("Host", StringComparison.OrdinalIgnoreCase)) continue;
                    if (h.Key.StartsWith("Content-", StringComparison.OrdinalIgnoreCase)) continue;
                    request.Headers.TryAddWithoutValidation(h.Key, h.Value.ToArray());
                }

                var key = _keys.GetNextKey();
                if (!string.IsNullOrEmpty(key))
                    request.Headers.Authorization = new("Bearer", key);

                var response = await client.SendAsync(
                    request,
                    HttpCompletionOption.ResponseHeadersRead,
                    ctx.RequestAborted);

                _log.LogInformation("Upstream {Url} responded {Status}", upstream, response.StatusCode);

                if (response.IsSuccessStatusCode)
                {
                    ctx.Response.StatusCode = (int)response.StatusCode;
                    ctx.Response.ContentType = response.Content.Headers.ContentType?.ToString() ?? "application/json";
                    await response.Content.CopyToAsync(ctx.Response.Body);
                    return Results.Empty;
                }

                if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
                {
                    _log.LogWarning("Rate limited by {Url}, trying next upstream...", upstream);
                    continue; // try next in chain
                }
            }
            catch (HttpRequestException ex)
            {
                _log.LogWarning("Upstream {Url} unreachable: {Msg}", upstream, ex.Message);
            }
            catch (TaskCanceledException)
            {
                _log.LogWarning("Upstream {Url} timed out", upstream);
            }
        }

        _log.LogError("All {Count} upstream providers exhausted", _chain.Length);
        return Results.Problem("All upstream providers exhausted", statusCode: 503);
    }
}
