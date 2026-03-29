namespace TaskPilot.Api.Models;

public class Report
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Title { get; set; } = string.Empty;
    public string ReportType { get; set; } = "status"; // daily, weekly, standup, sprint, status
    public string Content { get; set; } = string.Empty;
    public string MetricsJson { get; set; } = "{}";
    public string ProjectId { get; set; } = string.Empty;
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    public string GeneratedBy { get; set; } = "agent"; // agent, manual

    public Project? Project { get; set; }
}
