using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TaskPilot.Api.Data;
using TaskPilot.Api.Hubs;
using TaskPilot.Api.Models;
using Microsoft.AspNetCore.SignalR;

namespace TaskPilot.Api.Services;

public class AgentOrchestratorService
{
    private readonly AppDbContext _db;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _config;
    private readonly IHubContext<AgentHub> _hubContext;
    private readonly ILogger<AgentOrchestratorService> _logger;

    public AgentOrchestratorService(
        AppDbContext db,
        IHttpClientFactory httpClientFactory,
        IConfiguration config,
        IHubContext<AgentHub> hubContext,
        ILogger<AgentOrchestratorService> logger)
    {
        _db = db;
        _httpClientFactory = httpClientFactory;
        _config = config;
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task<AgentSession> RunAgentAsync(AgentRunDto dto)
    {
        var session = new AgentSession
        {
            Instruction = dto.Instruction,
            State = "thinking",
            AutonomyLevel = dto.AutonomyLevel,
            StartedAt = DateTime.UtcNow
        };

        _db.AgentSessions.Add(session);
        await _db.SaveChangesAsync();

        await _hubContext.Clients.All.SendAsync("AgentStateChanged", new
        {
            sessionId = session.Id,
            state = "thinking",
            instruction = dto.Instruction
        });

        try
        {
            var agentBaseUrl = _config["AgentCore:BaseUrl"] ?? "http://localhost:8001";
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromMinutes(5);

            var requestBody = new
            {
                instruction = dto.Instruction,
                project_id = dto.ProjectId,
                autonomy_level = dto.AutonomyLevel
            };

            var content = new StringContent(
                JsonSerializer.Serialize(requestBody),
                Encoding.UTF8,
                "application/json"
            );

            var response = await client.PostAsync($"{agentBaseUrl}/agent/run-sync", content);
            var responseJson = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                var result = JsonSerializer.Deserialize<JsonElement>(responseJson);

                session.State = result.GetProperty("state").GetString() ?? "completed";
                session.TotalSteps = result.GetProperty("total_steps").GetInt32();
                session.StepsJson = responseJson;
                session.CompletedAt = DateTime.UtcNow;

                if (result.TryGetProperty("steps", out var steps))
                {
                    foreach (var step in steps.EnumerateArray())
                    {
                        if (step.TryGetProperty("actions", out var actions))
                        {
                            foreach (var action in actions.EnumerateArray())
                            {
                                var agentAction = new AgentAction
                                {
                                    SessionId = session.Id,
                                    ToolName = action.GetProperty("tool_name").GetString() ?? "",
                                    ActionType = action.TryGetProperty("arguments", out var args) &&
                                                 args.TryGetProperty("action", out var actType)
                                        ? actType.GetString() ?? "execute"
                                        : "execute",
                                    ArgumentsJson = action.GetProperty("arguments").GetRawText(),
                                    Success = action.GetProperty("success").GetBoolean(),
                                    Error = action.TryGetProperty("error", out var err) ? err.GetString() : null,
                                    Timestamp = DateTime.UtcNow
                                };
                                _db.AgentActions.Add(agentAction);
                                session.TotalActions++;
                            }
                        }
                    }
                }
            }
            else
            {
                session.State = "error";
                session.Error = $"Agent core returned {response.StatusCode}: {responseJson}";
            }
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Could not reach agent core. Using fallback response.");
            session.State = "completed";
            session.TotalSteps = 1;
            session.CompletedAt = DateTime.UtcNow;
            session.StepsJson = JsonSerializer.Serialize(new
            {
                message = "Agent core unavailable. Session recorded for later processing.",
                instruction = dto.Instruction
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error running agent");
            session.State = "error";
            session.Error = ex.Message;
        }

        await _db.SaveChangesAsync();

        await _hubContext.Clients.All.SendAsync("AgentStateChanged", new
        {
            sessionId = session.Id,
            state = session.State,
            completedAt = session.CompletedAt
        });

        return session;
    }

    public async Task<object?> GetAgentStatusAsync()
    {
        try
        {
            var agentBaseUrl = _config["AgentCore:BaseUrl"] ?? "http://localhost:8001";
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(5);

            var response = await client.GetAsync($"{agentBaseUrl}/agent/status");
            if (response.IsSuccessStatusCode)
            {
                var json = await response.Content.ReadAsStringAsync();
                return JsonSerializer.Deserialize<JsonElement>(json);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not reach agent core for status");
        }

        var lastSession = await _db.AgentSessions
            .OrderByDescending(s => s.StartedAt)
            .FirstOrDefaultAsync();

        return new
        {
            state = "offline",
            lastSession = lastSession != null ? new
            {
                id = lastSession.Id,
                instruction = lastSession.Instruction,
                state = lastSession.State,
                startedAt = lastSession.StartedAt,
                completedAt = lastSession.CompletedAt
            } : null,
            message = "Agent core is not reachable. Showing last known state."
        };
    }

    public async Task<bool> StopAgentAsync()
    {
        try
        {
            var agentBaseUrl = _config["AgentCore:BaseUrl"] ?? "http://localhost:8001";
            var client = _httpClientFactory.CreateClient();
            var response = await client.PostAsync($"{agentBaseUrl}/agent/stop", null);
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    public async Task<List<AgentSession>> GetSessionHistoryAsync(int limit = 20)
    {
        return await _db.AgentSessions
            .Include(s => s.Actions)
            .OrderByDescending(s => s.StartedAt)
            .Take(limit)
            .ToListAsync();
    }

    public async Task<List<AgentAction>> GetActionHistoryAsync(int limit = 50)
    {
        return await _db.AgentActions
            .OrderByDescending(a => a.Timestamp)
            .Take(limit)
            .ToListAsync();
    }
}
