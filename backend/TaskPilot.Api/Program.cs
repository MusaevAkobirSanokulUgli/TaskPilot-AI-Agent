using Microsoft.EntityFrameworkCore;
using TaskPilot.Api.Data;
using TaskPilot.Api.Hubs;
using TaskPilot.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Database
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(
        builder.Configuration.GetConnectionString("DefaultConnection")
        ?? "Data Source=taskpilot.db"
    )
);

// Services
builder.Services.AddScoped<TaskManagementService>();
builder.Services.AddScoped<AgentOrchestratorService>();
builder.Services.AddScoped<ReportService>();

// HTTP Client for Agent Core communication
builder.Services.AddHttpClient();

// SignalR
builder.Services.AddSignalR();

// Controllers
builder.Services.AddControllers();

// CORS
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? new[] { "http://localhost:3000", "http://localhost:3002", "http://localhost:3200", "http://localhost:19006", "http://localhost:8082" };
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "TaskPilot API", Version = "v1" });
});

var app = builder.Build();

// Ensure database is created and seeded
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
}

// Middleware pipeline
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "TaskPilot API v1");
    c.RoutePrefix = "swagger";
});

app.UseCors();

app.MapControllers();
app.MapHub<AgentHub>("/hubs/agent");

// Health check
app.MapGet("/", () => new
{
    service = "TaskPilot API",
    status = "running",
    version = "1.0.0"
});

app.Run();
