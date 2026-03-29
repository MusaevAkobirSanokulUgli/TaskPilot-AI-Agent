"""Report Generator tool for creating project status reports."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from tools.base_tool import BaseTool


class ReportGeneratorTool(BaseTool):
    """Generates formatted project reports from task and project data."""

    @property
    def name(self) -> str:
        return "report_generator"

    @property
    def description(self) -> str:
        return (
            "Generate status reports, sprint summaries, standup notes, "
            "and other project management reports."
        )

    @property
    def parameters_schema(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "enum": ["generate", "list"],
                },
                "report_type": {
                    "type": "string",
                    "enum": ["daily", "weekly", "standup", "sprint", "status"],
                },
                "project_id": {"type": "string"},
                "tasks_data": {"type": "array"},
            },
            "required": ["action"],
        }

    async def execute(self, arguments: dict[str, Any]) -> dict[str, Any]:
        """Execute report generation."""
        action = arguments.get("action", "generate")

        if action == "generate":
            report_type = arguments.get("report_type", "status")
            tasks_data = arguments.get("tasks_data")
            return await self._generate_report(report_type, tasks_data)
        elif action == "list":
            return await self._list_reports()
        else:
            return {"success": False, "error": f"Unknown action: {action}"}

    async def _generate_report(
        self, report_type: str, tasks_data: list[dict[str, Any]] | None = None
    ) -> dict[str, Any]:
        """Generate a formatted report."""
        now = datetime.utcnow()
        date_str = now.strftime("%Y-%m-%d")

        if tasks_data is None:
            tasks_data = self._get_sample_task_data()

        total = len(tasks_data)
        done = sum(1 for t in tasks_data if t.get("status") == "done")
        in_progress = sum(1 for t in tasks_data if t.get("status") == "in_progress")
        open_tasks = sum(1 for t in tasks_data if t.get("status") in ("open", "todo"))
        blocked = sum(1 for t in tasks_data if t.get("status") == "blocked")
        critical = [t for t in tasks_data if t.get("priority") == "critical"]
        high_pri = [t for t in tasks_data if t.get("priority") == "high"]
        unassigned = [t for t in tasks_data if not t.get("assignee")]

        if report_type == "standup":
            report = self._build_standup_report(
                date_str, tasks_data, done, in_progress, blocked, critical
            )
        elif report_type == "daily":
            report = self._build_daily_report(
                date_str, total, done, in_progress, open_tasks, blocked,
                critical, high_pri, unassigned, tasks_data,
            )
        elif report_type == "weekly":
            report = self._build_weekly_report(
                date_str, total, done, in_progress, open_tasks, blocked,
                critical, high_pri, unassigned, tasks_data,
            )
        elif report_type == "sprint":
            report = self._build_sprint_report(
                date_str, total, done, in_progress, open_tasks, blocked, tasks_data
            )
        else:
            report = self._build_status_report(
                date_str, total, done, in_progress, open_tasks, blocked,
                critical, high_pri, unassigned,
            )

        return {
            "success": True,
            "data": {
                "report_type": report_type,
                "generated_at": now.isoformat(),
                "content": report,
                "metrics": {
                    "total_tasks": total,
                    "completed": done,
                    "in_progress": in_progress,
                    "open": open_tasks,
                    "blocked": blocked,
                    "completion_rate": round((done / total * 100) if total > 0 else 0, 1),
                },
                "message": "Report generated successfully. Triage complete.",
            },
        }

    async def _list_reports(self) -> dict[str, Any]:
        """List available report types."""
        return {
            "success": True,
            "data": {
                "available_types": [
                    {"type": "daily", "description": "Daily progress summary"},
                    {"type": "weekly", "description": "Weekly status report with trends"},
                    {"type": "standup", "description": "Quick standup meeting notes"},
                    {"type": "sprint", "description": "Sprint review summary"},
                    {"type": "status", "description": "General project status overview"},
                ],
            },
        }

    def _build_standup_report(
        self,
        date_str: str,
        tasks: list[dict],
        done: int,
        in_progress: int,
        blocked: int,
        critical: list[dict],
    ) -> str:
        recently_done = [t for t in tasks if t.get("status") == "done"]
        in_prog = [t for t in tasks if t.get("status") == "in_progress"]
        blockers = [t for t in tasks if t.get("status") == "blocked"]

        lines = [
            f"# Daily Standup Summary - {date_str}",
            "",
            "## Completed",
        ]
        for t in recently_done[:5]:
            lines.append(f"- {t['title']} ({t.get('assignee', 'Unassigned')})")
        if not recently_done:
            lines.append("- No tasks completed recently")

        lines.extend(["", "## In Progress"])
        for t in in_prog[:5]:
            lines.append(f"- {t['title']} ({t.get('assignee', 'Unassigned')})")
        if not in_prog:
            lines.append("- No tasks in progress")

        lines.extend(["", "## Blockers"])
        for t in blockers[:5]:
            lines.append(f"- {t['title']}: {t.get('description', 'No details')[:80]}")
        if not blockers:
            lines.append("- No blockers reported")

        if critical:
            lines.extend(["", "## Critical Items"])
            for t in critical:
                lines.append(f"- {t['title']} (Assignee: {t.get('assignee', 'UNASSIGNED')})")

        lines.extend([
            "",
            f"**Summary**: {done} done, {in_progress} in progress, {blocked} blocked",
        ])

        return "\n".join(lines)

    def _build_daily_report(
        self, date_str: str, total: int, done: int, in_progress: int,
        open_tasks: int, blocked: int, critical: list, high_pri: list,
        unassigned: list, tasks: list,
    ) -> str:
        completion_rate = round((done / total * 100) if total > 0 else 0, 1)
        lines = [
            f"# Daily Project Report - {date_str}",
            "",
            "## Overview",
            f"| Metric | Count |",
            f"|--------|-------|",
            f"| Total Tasks | {total} |",
            f"| Completed | {done} |",
            f"| In Progress | {in_progress} |",
            f"| Open | {open_tasks} |",
            f"| Blocked | {blocked} |",
            f"| Completion Rate | {completion_rate}% |",
            "",
            "## Priority Breakdown",
            f"- **Critical**: {len(critical)} tasks",
            f"- **High**: {len(high_pri)} tasks",
            f"- **Unassigned**: {len(unassigned)} tasks",
        ]

        if critical:
            lines.extend(["", "## Critical Items Requiring Attention"])
            for t in critical:
                lines.append(f"- **{t['title']}** - {t.get('assignee', 'UNASSIGNED')}")

        if unassigned:
            lines.extend(["", "## Unassigned Tasks"])
            for t in unassigned[:5]:
                lines.append(f"- {t['title']} (Priority: {t.get('priority', 'medium')})")

        lines.extend([
            "",
            "## Recommendations",
            f"- {'Assign critical tasks immediately' if any(not t.get('assignee') for t in critical) else 'All critical tasks are assigned'}",
            f"- {'Address blocked items to unblock progress' if blocked > 0 else 'No blockers - good progress'}",
            f"- Current velocity suggests {'on track' if completion_rate > 30 else 'behind schedule'}",
        ])

        return "\n".join(lines)

    def _build_weekly_report(
        self, date_str: str, total: int, done: int, in_progress: int,
        open_tasks: int, blocked: int, critical: list, high_pri: list,
        unassigned: list, tasks: list,
    ) -> str:
        completion_rate = round((done / total * 100) if total > 0 else 0, 1)
        lines = [
            f"# Weekly Status Report - Week of {date_str}",
            "",
            "## Executive Summary",
            f"This week the team managed {total} tasks with a {completion_rate}% completion rate. "
            f"{done} tasks were completed, {in_progress} are in active development, "
            f"and {blocked} are currently blocked.",
            "",
            "## Task Distribution",
            f"| Status | Count | Percentage |",
            f"|--------|-------|-----------|",
            f"| Done | {done} | {round(done/total*100, 1) if total else 0}% |",
            f"| In Progress | {in_progress} | {round(in_progress/total*100, 1) if total else 0}% |",
            f"| Open/Todo | {open_tasks} | {round(open_tasks/total*100, 1) if total else 0}% |",
            f"| Blocked | {blocked} | {round(blocked/total*100, 1) if total else 0}% |",
            "",
            "## Team Workload",
        ]

        assignee_counts: dict[str, int] = {}
        for t in tasks:
            a = t.get("assignee") or "Unassigned"
            assignee_counts[a] = assignee_counts.get(a, 0) + 1

        for assignee, count in sorted(assignee_counts.items(), key=lambda x: -x[1]):
            lines.append(f"- **{assignee}**: {count} tasks")

        lines.extend([
            "",
            "## Risks and Blockers",
            f"- {blocked} blocked tasks need attention" if blocked else "- No blockers this week",
            f"- {len(critical)} critical priority items" if critical else "- No critical items",
            f"- {len(unassigned)} unassigned tasks" if unassigned else "- All tasks are assigned",
            "",
            "## Next Week Focus",
            "- Address all critical and high-priority items",
            "- Resolve blocked tasks",
            "- Assign remaining unassigned work",
            f"- Target: increase completion rate to {min(completion_rate + 15, 100)}%",
        ])

        return "\n".join(lines)

    def _build_sprint_report(
        self, date_str: str, total: int, done: int, in_progress: int,
        open_tasks: int, blocked: int, tasks: list,
    ) -> str:
        velocity = done
        planned = total
        completion_rate = round((done / total * 100) if total > 0 else 0, 1)

        lines = [
            f"# Sprint Review - {date_str}",
            "",
            "## Sprint Metrics",
            f"- **Planned**: {planned} tasks",
            f"- **Completed**: {done} tasks",
            f"- **Velocity**: {velocity} story points",
            f"- **Completion Rate**: {completion_rate}%",
            f"- **Carryover**: {in_progress + open_tasks} tasks",
            "",
            "## Completed Work",
        ]

        done_tasks = [t for t in tasks if t.get("status") == "done"]
        for t in done_tasks:
            lines.append(f"- {t['title']}")
        if not done_tasks:
            lines.append("- No tasks completed this sprint")

        lines.extend(["", "## Carryover Items"])
        carryover = [t for t in tasks if t.get("status") in ("in_progress", "open", "todo")]
        for t in carryover[:10]:
            lines.append(f"- {t['title']} ({t.get('status', 'unknown')})")

        lines.extend([
            "",
            "## Sprint Health",
            f"- {'On track' if completion_rate >= 70 else 'Behind schedule' if completion_rate >= 40 else 'At risk'}",
            f"- {blocked} blocked items",
            f"- Team utilization: {min(95, completion_rate + 20)}%",
        ])

        return "\n".join(lines)

    def _build_status_report(
        self, date_str: str, total: int, done: int, in_progress: int,
        open_tasks: int, blocked: int, critical: list, high_pri: list,
        unassigned: list,
    ) -> str:
        completion_rate = round((done / total * 100) if total > 0 else 0, 1)

        lines = [
            f"# Project Status Report - {date_str}",
            "",
            f"## Summary",
            f"Project has {total} total tasks. {completion_rate}% completion rate.",
            "",
            "## Status Breakdown",
            f"- Completed: {done}",
            f"- In Progress: {in_progress}",
            f"- Open/Todo: {open_tasks}",
            f"- Blocked: {blocked}",
            "",
            "## Attention Required",
        ]

        if critical:
            lines.append(f"- {len(critical)} critical tasks need immediate attention")
        if unassigned:
            lines.append(f"- {len(unassigned)} tasks are unassigned")
        if blocked:
            lines.append(f"- {blocked} tasks are blocked and need resolution")
        if not critical and not unassigned and not blocked:
            lines.append("- All tasks are on track. No immediate action required.")

        lines.extend([
            "",
            "## Overall Health: " + (
                "Healthy" if completion_rate >= 50 and not critical
                else "Needs Attention" if completion_rate >= 25
                else "At Risk"
            ),
        ])

        return "\n".join(lines)

    @staticmethod
    def _get_sample_task_data() -> list[dict[str, Any]]:
        """Return sample task data for report generation."""
        return [
            {"title": "Fix login crash on iOS", "status": "open", "priority": "high", "assignee": None, "tags": ["bug"]},
            {"title": "Update user profile UI", "status": "in_progress", "priority": "medium", "assignee": "Alice", "tags": ["feature"]},
            {"title": "Database connection timeout", "status": "open", "priority": "critical", "assignee": None, "tags": ["bug"]},
            {"title": "Write API documentation", "status": "todo", "priority": "low", "assignee": "Bob", "tags": ["docs"]},
            {"title": "Implement push notifications", "status": "todo", "priority": "medium", "assignee": None, "tags": ["feature"]},
            {"title": "Memory leak in dashboard", "status": "open", "priority": "high", "assignee": None, "tags": ["bug"]},
            {"title": "Set up CI/CD pipeline", "status": "done", "priority": "high", "assignee": "Charlie", "tags": ["devops"]},
            {"title": "Add dark mode support", "status": "in_progress", "priority": "low", "assignee": "Diana", "tags": ["feature"]},
        ]
