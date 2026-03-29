using Microsoft.AspNetCore.Mvc;
using TaskPilot.Api.Models;
using TaskPilot.Api.Services;

namespace TaskPilot.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AgentController : ControllerBase
{
    private readonly AgentOrchestratorService _agentService;

    public AgentController(AgentOrchestratorService agentService)
    {
        _agentService = agentService;
    }

    [HttpPost("run")]
    public async Task<ActionResult> Run([FromBody] AgentRunDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Instruction))
            return BadRequest(new { error = "Instruction is required" });

        var session = await _agentService.RunAgentAsync(dto);
        return Ok(new
        {
            sessionId = session.Id,
            state = session.State,
            instruction = session.Instruction,
            totalSteps = session.TotalSteps,
            totalActions = session.TotalActions,
            startedAt = session.StartedAt,
            completedAt = session.CompletedAt,
            error = session.Error
        });
    }

    [HttpGet("status")]
    public async Task<ActionResult> GetStatus()
    {
        var status = await _agentService.GetAgentStatusAsync();
        return Ok(status);
    }

    [HttpPost("stop")]
    public async Task<ActionResult> Stop()
    {
        var stopped = await _agentService.StopAgentAsync();
        return Ok(new { stopped, message = stopped ? "Agent stop requested" : "Could not reach agent" });
    }

    [HttpGet("sessions")]
    public async Task<ActionResult> GetSessions([FromQuery] int limit = 20)
    {
        var sessions = await _agentService.GetSessionHistoryAsync(limit);
        return Ok(sessions.Select(s => new
        {
            s.Id,
            s.Instruction,
            s.State,
            s.AutonomyLevel,
            s.TotalSteps,
            s.TotalActions,
            s.StartedAt,
            s.CompletedAt,
            s.Error
        }));
    }

    [HttpGet("actions")]
    public async Task<ActionResult> GetActions([FromQuery] int limit = 50)
    {
        var actions = await _agentService.GetActionHistoryAsync(limit);
        return Ok(new
        {
            actions = actions.Select(a => new
            {
                a.Id,
                a.SessionId,
                a.ActionType,
                a.ToolName,
                a.ArgumentsJson,
                a.Success,
                a.Error,
                a.Timestamp
            }),
            total = actions.Count
        });
    }
}
