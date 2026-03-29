using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TaskPilot.Api.Data;
using TaskPilot.Api.Models;

namespace TaskPilot.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MemoryController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _config;

    public MemoryController(AppDbContext db, IHttpClientFactory httpClientFactory, IConfiguration config)
    {
        _db = db;
        _httpClientFactory = httpClientFactory;
        _config = config;
    }

    [HttpGet]
    public async Task<ActionResult> GetAll([FromQuery] string? memoryType)
    {
        // Try to get from agent core first
        try
        {
            var agentBaseUrl = _config["AgentCore:BaseUrl"] ?? "http://localhost:8001";
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(5);

            var response = await client.GetAsync($"{agentBaseUrl}/agent/memory");
            if (response.IsSuccessStatusCode)
            {
                var json = await response.Content.ReadAsStringAsync();
                return Ok(JsonSerializer.Deserialize<JsonElement>(json));
            }
        }
        catch
        {
            // Fall through to database
        }

        var query = _db.Memories.AsQueryable();
        if (!string.IsNullOrEmpty(memoryType))
            query = query.Where(m => m.MemoryType == memoryType);

        var memories = await query.OrderByDescending(m => m.CreatedAt).ToListAsync();

        var grouped = new
        {
            short_term = memories.Where(m => m.MemoryType == "short_term").Select(ToDto),
            working = memories.Where(m => m.MemoryType == "working").Select(ToDto),
            long_term = memories.Where(m => m.MemoryType == "long_term").Select(ToDto)
        };

        return Ok(grouped);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult> GetById(string id)
    {
        var memory = await _db.Memories.FindAsync(id);
        if (memory == null) return NotFound();
        return Ok(ToDto(memory));
    }

    [HttpPost]
    public async Task<ActionResult> Create([FromBody] MemoryDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Content))
            return BadRequest(new { error = "Content is required" });

        // Try to add to agent core
        try
        {
            var agentBaseUrl = _config["AgentCore:BaseUrl"] ?? "http://localhost:8001";
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(5);

            var content = new StringContent(
                JsonSerializer.Serialize(new { content = dto.Content, memory_type = dto.MemoryType, metadata = dto.Metadata ?? new() }),
                System.Text.Encoding.UTF8,
                "application/json"
            );

            var response = await client.PostAsync($"{agentBaseUrl}/agent/memory", content);
            if (response.IsSuccessStatusCode)
            {
                var json = await response.Content.ReadAsStringAsync();
                return Ok(JsonSerializer.Deserialize<JsonElement>(json));
            }
        }
        catch
        {
            // Fall through to database
        }

        var memory = new Memory
        {
            Content = dto.Content,
            MemoryType = dto.MemoryType,
            MetadataJson = JsonSerializer.Serialize(dto.Metadata ?? new Dictionary<string, object>()),
            CreatedAt = DateTime.UtcNow
        };

        _db.Memories.Add(memory);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = memory.Id }, ToDto(memory));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> Update(string id, [FromBody] MemoryDto dto)
    {
        // Try agent core first
        try
        {
            var agentBaseUrl = _config["AgentCore:BaseUrl"] ?? "http://localhost:8001";
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(5);

            var content = new StringContent(
                JsonSerializer.Serialize(new { content = dto.Content }),
                System.Text.Encoding.UTF8,
                "application/json"
            );

            var response = await client.PutAsync($"{agentBaseUrl}/agent/memory/{id}", content);
            if (response.IsSuccessStatusCode)
            {
                var json = await response.Content.ReadAsStringAsync();
                return Ok(JsonSerializer.Deserialize<JsonElement>(json));
            }
        }
        catch { }

        var memory = await _db.Memories.FindAsync(id);
        if (memory == null) return NotFound();

        memory.Content = dto.Content;
        await _db.SaveChangesAsync();

        return Ok(ToDto(memory));
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(string id)
    {
        // Try agent core first
        try
        {
            var agentBaseUrl = _config["AgentCore:BaseUrl"] ?? "http://localhost:8001";
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(5);

            var response = await client.DeleteAsync($"{agentBaseUrl}/agent/memory/{id}");
            if (response.IsSuccessStatusCode)
                return Ok(new { deleted = id });
        }
        catch { }

        var memory = await _db.Memories.FindAsync(id);
        if (memory == null) return NotFound();

        _db.Memories.Remove(memory);
        await _db.SaveChangesAsync();

        return Ok(new { deleted = id });
    }

    private static object ToDto(Memory m) => new
    {
        m.Id,
        m.Content,
        memoryType = m.MemoryType,
        metadata = m.MetadataJson,
        createdAt = m.CreatedAt,
        relevanceScore = m.RelevanceScore
    };
}
