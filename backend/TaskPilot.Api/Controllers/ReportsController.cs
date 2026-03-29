using Microsoft.AspNetCore.Mvc;
using TaskPilot.Api.Services;

namespace TaskPilot.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReportsController : ControllerBase
{
    private readonly ReportService _reportService;

    public ReportsController(ReportService reportService)
    {
        _reportService = reportService;
    }

    [HttpGet]
    public async Task<ActionResult> GetAll([FromQuery] string? projectId, [FromQuery] string? reportType)
    {
        var reports = await _reportService.GetReportsAsync(projectId, reportType);
        return Ok(reports.Select(r => new
        {
            r.Id,
            r.Title,
            r.ReportType,
            r.Content,
            r.MetricsJson,
            r.ProjectId,
            r.GeneratedAt,
            r.GeneratedBy
        }));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult> GetById(string id)
    {
        var report = await _reportService.GetReportByIdAsync(id);
        if (report == null) return NotFound();
        return Ok(report);
    }

    [HttpPost("generate")]
    public async Task<ActionResult> Generate([FromBody] GenerateReportDto dto)
    {
        var projectId = dto.ProjectId ?? "proj-001";
        var reportType = dto.ReportType ?? "status";

        var report = await _reportService.GenerateReportAsync(projectId, reportType);
        return Ok(new
        {
            report.Id,
            report.Title,
            report.ReportType,
            report.Content,
            report.MetricsJson,
            report.GeneratedAt
        });
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(string id)
    {
        var deleted = await _reportService.DeleteReportAsync(id);
        if (!deleted) return NotFound();
        return NoContent();
    }
}

public class GenerateReportDto
{
    public string? ProjectId { get; set; }
    public string? ReportType { get; set; }
}
