using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TaskPilot.Api.Data;
using TaskPilot.Api.Models;

namespace TaskPilot.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProjectsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ProjectsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<List<Project>>> GetAll()
    {
        var projects = await _db.Projects
            .Include(p => p.Tasks)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();
        return Ok(projects);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Project>> GetById(string id)
    {
        var project = await _db.Projects
            .Include(p => p.Tasks)
            .Include(p => p.Reports)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (project == null) return NotFound();
        return Ok(project);
    }

    [HttpPost]
    public async Task<ActionResult<Project>> Create([FromBody] Project project)
    {
        if (string.IsNullOrEmpty(project.Id))
            project.Id = Guid.NewGuid().ToString();

        project.CreatedAt = DateTime.UtcNow;
        project.UpdatedAt = DateTime.UtcNow;

        _db.Projects.Add(project);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = project.Id }, project);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<Project>> Update(string id, [FromBody] Project updated)
    {
        var project = await _db.Projects.FindAsync(id);
        if (project == null) return NotFound();

        if (!string.IsNullOrEmpty(updated.Name)) project.Name = updated.Name;
        if (!string.IsNullOrEmpty(updated.Description)) project.Description = updated.Description;
        if (!string.IsNullOrEmpty(updated.Status)) project.Status = updated.Status;
        if (!string.IsNullOrEmpty(updated.Owner)) project.Owner = updated.Owner;
        project.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(project);
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(string id)
    {
        var project = await _db.Projects.FindAsync(id);
        if (project == null) return NotFound();

        _db.Projects.Remove(project);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
