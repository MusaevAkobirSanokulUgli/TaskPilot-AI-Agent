namespace TaskPilot.Api.Models;

public class Memory
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Content { get; set; } = string.Empty;
    public string MemoryType { get; set; } = "long_term"; // short_term, working, long_term
    public string MetadataJson { get; set; } = "{}";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public double RelevanceScore { get; set; }
}

public class MemoryDto
{
    public string Content { get; set; } = string.Empty;
    public string MemoryType { get; set; } = "long_term";
    public Dictionary<string, object>? Metadata { get; set; }
}
