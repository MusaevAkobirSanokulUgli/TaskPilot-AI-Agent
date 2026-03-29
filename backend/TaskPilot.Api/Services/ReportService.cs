using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TaskPilot.Api.Data;
using TaskPilot.Api.Models;

namespace TaskPilot.Api.Services;

public class ReportService
{
    private readonly AppDbContext _db;
    private readonly TaskManagementService _taskService;
    private readonly ILogger<ReportService> _logger;

    public ReportService(AppDbContext db, TaskManagementService taskService, ILogger<ReportService> logger)
    {
        _db = db;
        _taskService = taskService;
        _logger = logger;
    }

    public async Task<List<Report>> GetReportsAsync(string? projectId = null, string? reportType = null)
    {
        var query = _db.Reports.AsQueryable();

        if (!string.IsNullOrEmpty(projectId))
            query = query.Where(r => r.ProjectId == projectId);

        if (!string.IsNullOrEmpty(reportType))
            query = query.Where(r => r.ReportType == reportType);

        return await query.OrderByDescending(r => r.GeneratedAt).ToListAsync();
    }

    public async Task<Report?> GetReportByIdAsync(string id)
    {
        return await _db.Reports.FindAsync(id);
    }

    public async Task<Report> GenerateReportAsync(string projectId, string reportType)
    {
        var tasks = await _taskService.GetAllTasksAsync(projectId);
        var stats = await _taskService.GetTaskStatsAsync(projectId);
        var statsJson = JsonSerializer.Serialize(stats);

        var content = GenerateReportContent(reportType, tasks, stats);

        var report = new Report
        {
            Title = $"{char.ToUpper(reportType[0]) + reportType[1..]} Report - {DateTime.UtcNow:yyyy-MM-dd}",
            ReportType = reportType,
            Content = content,
            MetricsJson = statsJson,
            ProjectId = projectId,
            GeneratedAt = DateTime.UtcNow,
            GeneratedBy = "agent"
        };

        _db.Reports.Add(report);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Generated {ReportType} report for project {ProjectId}", reportType, projectId);
        return report;
    }

    public async Task<bool> DeleteReportAsync(string id)
    {
        var report = await _db.Reports.FindAsync(id);
        if (report == null) return false;

        _db.Reports.Remove(report);
        await _db.SaveChangesAsync();
        return true;
    }

    private static string GenerateReportContent(string reportType, List<TaskItem> tasks, object stats)
    {
        var total = tasks.Count;
        var done = tasks.Count(t => t.Status == "done");
        var inProgress = tasks.Count(t => t.Status == "in_progress");
        var open = tasks.Count(t => t.Status is "open" or "todo");
        var blocked = tasks.Count(t => t.Status == "blocked");
        var critical = tasks.Where(t => t.Priority == "critical").ToList();
        var unassigned = tasks.Where(t => string.IsNullOrEmpty(t.Assignee)).ToList();
        var completionRate = total > 0 ? Math.Round((double)done / total * 100, 1) : 0;
        var dateStr = DateTime.UtcNow.ToString("yyyy-MM-dd");

        return reportType switch
        {
            "standup" => BuildStandupReport(dateStr, tasks, done, inProgress, blocked),
            "daily" => BuildDailyReport(dateStr, total, done, inProgress, open, blocked, critical, unassigned, completionRate),
            "weekly" => BuildWeeklyReport(dateStr, total, done, inProgress, open, blocked, critical, unassigned, tasks, completionRate),
            _ => BuildStatusReport(dateStr, total, done, inProgress, open, blocked, critical, unassigned, completionRate)
        };
    }

    private static string BuildStandupReport(string dateStr, List<TaskItem> tasks, int done, int inProgress, int blocked)
    {
        var lines = new List<string>
        {
            $"# Daily Standup - {dateStr}",
            "",
            "## Completed"
        };

        foreach (var t in tasks.Where(t => t.Status == "done").Take(5))
            lines.Add($"- {t.Title} ({t.Assignee ?? "Unassigned"})");

        lines.Add("");
        lines.Add("## In Progress");
        foreach (var t in tasks.Where(t => t.Status == "in_progress").Take(5))
            lines.Add($"- {t.Title} ({t.Assignee ?? "Unassigned"})");

        lines.Add("");
        lines.Add("## Blockers");
        var blockedTasks = tasks.Where(t => t.Status == "blocked").ToList();
        if (blockedTasks.Any())
            foreach (var t in blockedTasks)
                lines.Add($"- {t.Title}");
        else
            lines.Add("- No blockers reported");

        lines.Add("");
        lines.Add($"**Summary**: {done} done, {inProgress} in progress, {blocked} blocked");

        return string.Join("\n", lines);
    }

    private static string BuildDailyReport(string dateStr, int total, int done, int inProgress, int open, int blocked,
        List<TaskItem> critical, List<TaskItem> unassigned, double completionRate)
    {
        var lines = new List<string>
        {
            $"# Daily Project Report - {dateStr}",
            "",
            "## Overview",
            "| Metric | Count |",
            "|--------|-------|",
            $"| Total Tasks | {total} |",
            $"| Completed | {done} |",
            $"| In Progress | {inProgress} |",
            $"| Open | {open} |",
            $"| Blocked | {blocked} |",
            $"| Completion Rate | {completionRate}% |",
            "",
            "## Attention Required"
        };

        if (critical.Any())
            lines.Add($"- {critical.Count} critical tasks need immediate attention");
        if (unassigned.Any())
            lines.Add($"- {unassigned.Count} tasks are unassigned");
        if (blocked > 0)
            lines.Add($"- {blocked} tasks are blocked");

        return string.Join("\n", lines);
    }

    private static string BuildWeeklyReport(string dateStr, int total, int done, int inProgress, int open, int blocked,
        List<TaskItem> critical, List<TaskItem> unassigned, List<TaskItem> tasks, double completionRate)
    {
        var assigneeCounts = tasks
            .GroupBy(t => t.Assignee ?? "Unassigned")
            .Select(g => new { Name = g.Key, Count = g.Count() })
            .OrderByDescending(a => a.Count);

        var lines = new List<string>
        {
            $"# Weekly Status Report - Week of {dateStr}",
            "",
            "## Executive Summary",
            $"This week the team managed {total} tasks with a {completionRate}% completion rate.",
            "",
            "## Task Distribution",
            "| Status | Count |",
            "|--------|-------|",
            $"| Done | {done} |",
            $"| In Progress | {inProgress} |",
            $"| Open/Todo | {open} |",
            $"| Blocked | {blocked} |",
            "",
            "## Team Workload"
        };

        foreach (var a in assigneeCounts)
            lines.Add($"- **{a.Name}**: {a.Count} tasks");

        lines.Add("");
        lines.Add("## Risks");
        if (critical.Any()) lines.Add($"- {critical.Count} critical items");
        if (unassigned.Any()) lines.Add($"- {unassigned.Count} unassigned tasks");
        if (!critical.Any() && !unassigned.Any()) lines.Add("- No significant risks identified");

        return string.Join("\n", lines);
    }

    private static string BuildStatusReport(string dateStr, int total, int done, int inProgress, int open, int blocked,
        List<TaskItem> critical, List<TaskItem> unassigned, double completionRate)
    {
        var health = completionRate >= 50 && !critical.Any() ? "Healthy" :
                     completionRate >= 25 ? "Needs Attention" : "At Risk";

        var lines = new List<string>
        {
            $"# Project Status Report - {dateStr}",
            "",
            $"## Summary",
            $"Project has {total} total tasks with a {completionRate}% completion rate.",
            "",
            "## Status Breakdown",
            $"- Completed: {done}",
            $"- In Progress: {inProgress}",
            $"- Open/Todo: {open}",
            $"- Blocked: {blocked}",
            "",
            $"## Overall Health: {health}"
        };

        return string.Join("\n", lines);
    }
}
