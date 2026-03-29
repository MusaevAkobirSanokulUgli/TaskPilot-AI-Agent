namespace TaskPilot.Api.Models;

public class TaskItem
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Status { get; set; } = "todo"; // todo, open, in_progress, done, blocked
    public string Priority { get; set; } = "medium"; // critical, high, medium, low
    public string? Assignee { get; set; }
    public string ProjectId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DueDate { get; set; }
    public string Tags { get; set; } = "[]"; // JSON array stored as string

    public Project? Project { get; set; }
}

public class TaskItemDto
{
    public string? Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Status { get; set; } = "todo";
    public string Priority { get; set; } = "medium";
    public string? Assignee { get; set; }
    public string ProjectId { get; set; } = "proj-001";
    public DateTime? DueDate { get; set; }
    public string Tags { get; set; } = "[]";
}

public class TaskStatusUpdateDto
{
    public string Status { get; set; } = string.Empty;
}
