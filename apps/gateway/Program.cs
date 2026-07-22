using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;
using OmniGateway.Middleware;
using OmniGateway.Services;
using Serilog;

// ─── Serilog Bootstrap ───────────────────────────────────
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .WriteTo.File("logs/gateway-.log", rollingInterval: RollingInterval.Day)
    .CreateLogger();

var builder = WebApplication.CreateBuilder(args);
builder.Host.UseSerilog();

// ─── Configuration ───────────────────────────────────────
builder.Configuration.AddEnvironmentVariables();
if (File.Exists(".env"))
{
    foreach (var line in File.ReadAllLines(".env"))
    {
        if (line.StartsWith('#') || !line.Contains('=')) continue;
        var parts = line.Split('=', 2);
        Environment.SetEnvironmentVariable(parts[0].Trim(), parts[1].Trim());
    }
}

// ─── Rate Limiting (Atomic, Sliding Window) ──────────────
builder.Services.AddRateLimiter(options =>
{
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
        RateLimitPartition.GetSlidingWindowLimiter(
            partitionKey: ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new SlidingWindowRateLimiterOptions
            {
                PermitLimit = 100,
                Window = TimeSpan.FromMinutes(1),
                SegmentsPerWindow = 6,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 10
            }));

    options.OnRejected = async (context, token) =>
    {
        context.HttpContext.Response.StatusCode = 429;
        await context.HttpContext.Response.WriteAsJsonAsync(new
        {
            error = "rate_limit_exceeded",
            retry_after = context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retry)
                ? retry.TotalSeconds : 60
        }, token);
    };
});

// ─── Services ────────────────────────────────────────────
builder.Services.AddSingleton<ProxyChainService>();
builder.Services.AddSingleton<KeyRotationService>();
builder.Services.AddSingleton<TelemetryLogger>();
builder.Services.AddHttpClient();
builder.Services.AddCors(p => p.AddDefaultPolicy(b =>
    b.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));

var app = builder.Build();

// ─── Middleware Pipeline ─────────────────────────────────
app.UseSerilogRequestLogging();
app.UseCors();
app.UseRateLimiter();
app.UseMiddleware<RequestSanitizerMiddleware>();
app.UseMiddleware<AuthMiddleware>();
app.UseMiddleware<CircuitBreakerMiddleware>();

// ─── Health ──────────────────────────────────────────────
app.MapGet("/health", () => Results.Ok(new
{
    status = "healthy",
    timestamp = DateTimeOffset.UtcNow,
    version = "1.0.0"
}));

// ─── Unified Proxy Endpoints ─────────────────────────────
app.MapPost("/v1/chat/completions", async (HttpContext ctx, ProxyChainService proxy) =>
    await proxy.ForwardAsync(ctx));

app.MapPost("/v1/messages", async (HttpContext ctx, ProxyChainService proxy) =>
    await proxy.ForwardAsync(ctx));

// ─── Dashboard (static fallback) ─────────────────────────
app.MapGet("/", () => Results.Redirect("http://localhost:5173"));

var host = Environment.GetEnvironmentVariable("GATEWAY_HOST") ?? "0.0.0.0";
var port = Environment.GetEnvironmentVariable("GATEWAY_PORT") ?? "8088";

Log.Information("🦌 Omni-LLM Gateway starting on http://{Host}:{Port}", host, port);
app.Run($"http://{host}:{port}");
