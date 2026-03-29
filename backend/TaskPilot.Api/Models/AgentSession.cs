namespace TaskPilot.Api.Models;

public class AgentSession
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Instruction { get; set; } = string.Empty;
    public string State { get; set; } = "idle"; // idle, thinking, planning, acting, observing, completed, error, stopped
    public string AutonomyLevel { get; set; } = "supervised"; // supervised, semi_autonomous, autonomous
    public int TotalSteps { get; set; }
    public int TotalActions { get; set; }
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    public string? Error { get; set; }
    public string StepsJson { get; set; } = "[]"; // Full session steps as JSON

    public ICollection<AgentAction> Actions { get; set; } = new List<AgentAction>();
}

public class AgentRunDto
{
    public string Instruction { get; set; } = string.Empty;
    public string? ProjectId { get; set; }
    public string AutonomyLevel { get; set; } = "supervised";
}
