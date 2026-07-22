namespace OmniGateway.Middleware;

/// <summary>
/// Sanitizes all inbound requests: strips dangerous headers,
/// validates content-type, and enforces payload size limits.
/// </summary>
public class RequestSanitizerMiddleware
{
    private readonly RequestDelegate _next;
    private const long MaxBodyBytes = 10 * 1024 * 1024; // 10 MB

    private static readonly HashSet<string> StripHeaders = new(StringComparer.OrdinalIgnoreCase)
    {
        "X-Forwarded-For", "X-Real-IP", "X-Original-URL", "X-Rewrite-URL"
    };

    public RequestSanitizerMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext ctx)
    {
        // 1. Enforce body size
        if (ctx.Request.ContentLength > MaxBodyBytes)
        {
            ctx.Response.StatusCode = 413;
            await ctx.Response.WriteAsJsonAsync(new { error = "payload_too_large", maxBytes = MaxBodyBytes });
            return;
        }

        // 2. Strip spoofable headers
        foreach (var h in StripHeaders)
            ctx.Request.Headers.Remove(h);

        // 3. Enforce JSON content-type on POST
        if (ctx.Request.Method == "POST" &&
            !string.IsNullOrEmpty(ctx.Request.ContentType) &&
            !ctx.Request.ContentType.Contains("application/json", StringComparison.OrdinalIgnoreCase))
        {
            ctx.Response.StatusCode = 415;
            await ctx.Response.WriteAsJsonAsync(new { error = "json_content_type_required" });
            return;
        }

        await _next(ctx);
    }
}
