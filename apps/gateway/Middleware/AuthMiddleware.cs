namespace OmniGateway.Middleware;

/// <summary>
/// Optional bearer-token auth. Checks Authorization header if
/// GATEWAY_ACCESS_TOKEN env var is set. Pass-through if not configured.
/// </summary>
public class AuthMiddleware
{
    private readonly RequestDelegate _next;
    private readonly string? _accessToken;

    public AuthMiddleware(RequestDelegate next, IConfiguration cfg)
    {
        _next = next;
        _accessToken = Environment.GetEnvironmentVariable("GATEWAY_ACCESS_TOKEN") ?? cfg["GATEWAY_ACCESS_TOKEN"];
    }

    public async Task InvokeAsync(HttpContext ctx)
    {
        // Health endpoint is always open
        if (ctx.Request.Path.StartsWithSegments("/health"))
        {
            await _next(ctx);
            return;
        }

        // If no access token configured, allow all
        if (string.IsNullOrEmpty(_accessToken))
        {
            await _next(ctx);
            return;
        }

        var auth = ctx.Request.Headers.Authorization.FirstOrDefault();
        if (auth is null || !auth.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase) ||
            auth["Bearer ".Length..] != _accessToken)
        {
            ctx.Response.StatusCode = 401;
            await ctx.Response.WriteAsJsonAsync(new { error = "unauthorized" });
            return;
        }

        await _next(ctx);
    }
}
