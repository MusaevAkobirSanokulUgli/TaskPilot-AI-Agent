using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using TaskPilot.Api.Hubs;
using TaskPilot.Api.Models;
using TaskPilot.Api.Services;

namespace TaskPilot.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TasksController : ControllerBase
{
    private readonly TaskManagementService _taskService;
    private readonly IHubContext<AgentHub> _hubContext;

    public TasksController(TaskManagementService taskService, IHubContext<AgentHub> hubContext)
    {
        _taskService = taskService;
        _hubContext = hubContext;
    }

    [HttpGet]
    public async Task<ActionResult<List<TaskItem>>> GetAll(
        [FromQuery] string? projectId,
        [FromQuery] string? status,
        [FromQuery] string? priority,
        [FromQuery] string? assignee)
    {
        var tasks = await _taskService.GetAllTasksAsync(projectId, status, priority, assignee);
        return Ok(tasks);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<TaskItem>> GetById(string id)
    {
        var task = await _taskService.GetTaskByIdAsync(id);
        if (task == null) return NotFound();
        return Ok(task);
    }

    [HttpGet("stats")]
    public async Task<ActionResult> GetStats([FromQuery] string? projectId)
    {
        var stats = await _taskService.GetTaskStatsAsync(projectId);
        return Ok(stats);
    }

    [HttpPost]
    public async Task<ActionResult<TaskItem>> Create([FromBody] TaskItemDto dto)
    {
        var task = await _taskService.CreateTaskAsync(dto);

        await _hubContext.Clients.All.SendAsync("TaskCreated", task);

        return CreatedAtAction(nameof(GetById), new { id = task.Id }, task);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<TaskItem>> Update(string id, [FromBody] TaskItemDto dto)
    {
        var task = await _taskService.UpdateTaskAsync(id, dto);
        if (task == null) return NotFound();

        await _hubContext.Clients.All.SendAsync("TaskUpdated", task);

        return Ok(task);
    }

    [HttpPut("{id}/status")]
    public async Task<ActionResult<TaskItem>> UpdateStatus(string id, [FromBody] TaskStatusUpdateDto dto)
    {
        var task = await _taskService.UpdateTaskStatusAsync(id, dto.Status);
        if (task == null) return NotFound();

        await _hubContext.Clients.All.SendAsync("TaskUpdated", task);

        return Ok(task);
    }

    [HttpPut("{id}/assign")]
    public async Task<ActionResult<TaskItem>> Assign(string id, [FromBody] Dictionary<string, string> body)
    {
        var assignee = body.GetValueOrDefault("assignee", "");
        var task = await _taskService.AssignTaskAsync(id, assignee);
        if (task == null) return NotFound();

        await _hubContext.Clients.All.SendAsync("TaskAssigned", task);

        return Ok(task);
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(string id)
    {
        var deleted = await _taskService.DeleteTaskAsync(id);
        if (!deleted) return NotFound();

        await _hubContext.Clients.All.SendAsync("TaskDeleted", id);

        return NoContent();
    }
}
