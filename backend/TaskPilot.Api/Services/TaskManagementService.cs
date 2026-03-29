using Microsoft.EntityFrameworkCore;
using TaskPilot.Api.Data;
using TaskPilot.Api.Models;

namespace TaskPilot.Api.Services;

public class TaskManagementService
{
    private readonly AppDbContext _db;
    private readonly ILogger<TaskManagementService> _logger;

    public TaskManagementService(AppDbContext db, ILogger<TaskManagementService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<List<TaskItem>> GetAllTasksAsync(string? projectId = null, string? status = null, string? priority = null, string? assignee = null)
    {
        var query = _db.Tasks.AsQueryable();

        if (!string.IsNullOrEmpty(projectId))
            query = query.Where(t => t.ProjectId == projectId);

        if (!string.IsNullOrEmpty(status))
            query = query.Where(t => t.Status == status);

        if (!string.IsNullOrEmpty(priority))
            query = query.Where(t => t.Priority == priority);

        if (assignee != null)
        {
            if (assignee == "unassigned")
                query = query.Where(t => t.Assignee == null || t.Assignee == "");
            else
                query = query.Where(t => t.Assignee == assignee);
        }

        return await query.OrderByDescending(t => t.CreatedAt).ToListAsync();
    }

    public async Task<TaskItem?> GetTaskByIdAsync(string id)
    {
        return await _db.Tasks.FindAsync(id);
    }

    public async Task<TaskItem> CreateTaskAsync(TaskItemDto dto)
    {
        var task = new TaskItem
        {
            Id = dto.Id ?? Guid.NewGuid().ToString(),
            Title = dto.Title,
            Description = dto.Description,
            Status = dto.Status,
            Priority = dto.Priority,
            Assignee = dto.Assignee,
            ProjectId = dto.ProjectId,
            DueDate = dto.DueDate,
            Tags = dto.Tags,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.Tasks.Add(task);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Created task {TaskId}: {Title}", task.Id, task.Title);
        return task;
    }

    public async Task<TaskItem?> UpdateTaskAsync(string id, TaskItemDto dto)
    {
        var task = await _db.Tasks.FindAsync(id);
        if (task == null) return null;

        if (!string.IsNullOrEmpty(dto.Title)) task.Title = dto.Title;
        if (!string.IsNullOrEmpty(dto.Description)) task.Description = dto.Description;
        if (!string.IsNullOrEmpty(dto.Status)) task.Status = dto.Status;
        if (!string.IsNullOrEmpty(dto.Priority)) task.Priority = dto.Priority;
        if (dto.Assignee != null) task.Assignee = dto.Assignee;
        if (dto.DueDate.HasValue) task.DueDate = dto.DueDate;
        if (!string.IsNullOrEmpty(dto.Tags)) task.Tags = dto.Tags;

        task.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        _logger.LogInformation("Updated task {TaskId}: {Title}", task.Id, task.Title);
        return task;
    }

    public async Task<bool> DeleteTaskAsync(string id)
    {
        var task = await _db.Tasks.FindAsync(id);
        if (task == null) return false;

        _db.Tasks.Remove(task);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Deleted task {TaskId}", id);
        return true;
    }

    public async Task<TaskItem?> UpdateTaskStatusAsync(string id, string status)
    {
        var task = await _db.Tasks.FindAsync(id);
        if (task == null) return null;

        task.Status = status;
        task.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return task;
    }

    public async Task<TaskItem?> AssignTaskAsync(string id, string assignee)
    {
        var task = await _db.Tasks.FindAsync(id);
        if (task == null) return null;

        task.Assignee = assignee;
        task.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        _logger.LogInformation("Assigned task {TaskId} to {Assignee}", id, assignee);
        return task;
    }

    public async Task<object> GetTaskStatsAsync(string? projectId = null)
    {
        var query = _db.Tasks.AsQueryable();
        if (!string.IsNullOrEmpty(projectId))
            query = query.Where(t => t.ProjectId == projectId);

        var tasks = await query.ToListAsync();
        var total = tasks.Count;

        return new
        {
            total,
            byStatus = new
            {
                todo = tasks.Count(t => t.Status == "todo"),
                open = tasks.Count(t => t.Status == "open"),
                inProgress = tasks.Count(t => t.Status == "in_progress"),
                done = tasks.Count(t => t.Status == "done"),
                blocked = tasks.Count(t => t.Status == "blocked")
            },
            byPriority = new
            {
                critical = tasks.Count(t => t.Priority == "critical"),
                high = tasks.Count(t => t.Priority == "high"),
                medium = tasks.Count(t => t.Priority == "medium"),
                low = tasks.Count(t => t.Priority == "low")
            },
            unassigned = tasks.Count(t => string.IsNullOrEmpty(t.Assignee)),
            completionRate = total > 0 ? Math.Round((double)tasks.Count(t => t.Status == "done") / total * 100, 1) : 0,
            overdueCount = tasks.Count(t => t.DueDate.HasValue && t.DueDate < DateTime.UtcNow && t.Status != "done")
        };
    }
}
