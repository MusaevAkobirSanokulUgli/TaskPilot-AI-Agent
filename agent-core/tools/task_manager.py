"""Task Manager tool for creating, updating, listing, and assigning tasks.

Communicates with the .NET backend API or uses local mock data.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta
from typing import Any

import httpx

from config import settings
from tools.base_tool import BaseTool


# In-memory task store for when the .NET backend is unavailable
_mock_tasks: list[dict[str, Any]] = [
    {
        "id": "task-001",
        "title": "Fix login crash on iOS",
        "description": "App crashes when user taps login with empty password field",
        "status": "open",
        "priority": "high",
        "assignee": None,
        "projectId": "proj-001",
        "createdAt": "2026-03-10T09:00:00Z",
        "dueDate": "2026-03-17T17:00:00Z",
        "tags": ["bug", "ios", "auth"],
    },
    {
        "id": "task-002",
        "title": "Update user profile UI",
        "description": "Redesign the user profile page to match new design system",
        "status": "in_progress",
        "priority": "medium",
        "assignee": "Alice",
        "projectId": "proj-001",
        "createdAt": "2026-03-08T14:00:00Z",
        "dueDate": "2026-03-20T17:00:00Z",
        "tags": ["feature", "ui"],
    },
    {
        "id": "task-003",
        "title": "Database connection timeout in production",
        "description": "Intermittent connection timeouts to PostgreSQL under high load",
        "status": "open",
        "priority": "critical",
        "assignee": None,
        "projectId": "proj-001",
        "createdAt": "2026-03-12T08:30:00Z",
        "dueDate": "2026-03-15T17:00:00Z",
        "tags": ["bug", "database", "production"],
    },
    {
        "id": "task-004",
        "title": "Write API documentation for v2 endpoints",
        "description": "Document all new REST API endpoints for version 2.0",
        "status": "todo",
        "priority": "low",
        "assignee": "Bob",
        "projectId": "proj-001",
        "createdAt": "2026-03-11T10:00:00Z",
        "dueDate": "2026-03-25T17:00:00Z",
        "tags": ["docs", "api"],
    },
    {
        "id": "task-005",
        "title": "Implement push notifications",
        "description": "Add push notification support for task assignments and updates",
        "status": "todo",
        "priority": "medium",
        "assignee": None,
        "projectId": "proj-001",
        "createdAt": "2026-03-09T11:00:00Z",
        "dueDate": "2026-03-22T17:00:00Z",
        "tags": ["feature", "notifications"],
    },
    {
        "id": "task-006",
        "title": "Memory leak in dashboard component",
        "description": "Dashboard component does not clean up event listeners on unmount",
        "status": "open",
        "priority": "high",
        "assignee": None,
        "projectId": "proj-001",
        "createdAt": "2026-03-13T07:00:00Z",
        "dueDate": "2026-03-16T17:00:00Z",
        "tags": ["bug", "frontend", "performance"],
    },
    {
        "id": "task-007",
        "title": "Set up CI/CD pipeline",
        "description": "Configure GitHub Actions for automated testing and deployment",
        "status": "done",
        "priority": "high",
        "assignee": "Charlie",
        "projectId": "proj-001",
        "createdAt": "2026-03-05T09:00:00Z",
        "dueDate": "2026-03-12T17:00:00Z",
        "tags": ["devops", "ci-cd"],
    },
    {
        "id": "task-008",
        "title": "Add dark mode support",
        "description": "Implement dark mode theme toggle across the application",
        "status": "in_progress",
        "priority": "low",
        "assignee": "Diana",
        "projectId": "proj-001",
        "createdAt": "2026-03-07T13:00:00Z",
        "dueDate": "2026-03-21T17:00:00Z",
        "tags": ["feature", "ui", "theme"],
    },
]


class TaskManagerTool(BaseTool):
    """Manages tasks via the .NET backend API or local mock store."""

    @property
    def name(self) -> str:
        return "task_manager"

    @property
    def description(self) -> str:
        return (
            "Create, update, list, assign, and delete tasks. "
            "Supports filtering by status, priority, and assignee."
        )

    @property
    def parameters_schema(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "enum": ["list", "create", "update", "assign", "delete", "update_batch", "assign_batch"],
                },
                "id": {"type": "string"},
                "title": {"type": "string"},
                "description": {"type": "string"},
                "status": {"type": "string", "enum": ["todo", "open", "in_progress", "done", "blocked"]},
                "priority": {"type": "string", "enum": ["critical", "high", "medium", "low"]},
                "assignee": {"type": "string"},
                "filter": {"type": "object"},
                "updates": {"type": "array"},
                "assignments": {"type": "array"},
            },
            "required": ["action"],
        }

    async def execute(self, arguments: dict[str, Any]) -> dict[str, Any]:
        """Execute a task management action."""
        action = arguments.get("action", "list")

        try:
            result = await self._try_backend(action, arguments)
            return result
        except Exception:
            return await self._use_mock(action, arguments)

    async def _try_backend(self, action: str, arguments: dict[str, Any]) -> dict[str, Any]:
        """Try to execute via the .NET backend API."""
        base = settings.DOTNET_API_URL
        async with httpx.AsyncClient(timeout=10.0) as client:
            if action == "list":
                resp = await client.get(f"{base}/api/tasks")
                resp.raise_for_status()
                tasks = resp.json()
                task_filter = arguments.get("filter", {})
                if task_filter:
                    tasks = self._apply_filter(tasks, task_filter)
                return {"success": True, "data": {"tasks": tasks, "count": len(tasks)}}

            elif action == "create":
                payload = {
                    "title": arguments.get("title", "New Task"),
                    "description": arguments.get("description", ""),
                    "status": arguments.get("status", "todo"),
                    "priority": arguments.get("priority", "medium"),
                    "assignee": arguments.get("assignee"),
                    "projectId": arguments.get("projectId", "proj-001"),
                }
                resp = await client.post(f"{base}/api/tasks", json=payload)
                resp.raise_for_status()
                return {"success": True, "data": resp.json()}

            elif action == "update":
                task_id = arguments.get("id", "")
                payload = {k: v for k, v in arguments.items() if k not in ("action", "id")}
                resp = await client.put(f"{base}/api/tasks/{task_id}", json=payload)
                resp.raise_for_status()
                return {"success": True, "data": resp.json()}

            elif action == "assign":
                task_id = arguments.get("id", "")
                assignee = arguments.get("assignee", "")
                resp = await client.put(
                    f"{base}/api/tasks/{task_id}",
                    json={"assignee": assignee},
                )
                resp.raise_for_status()
                return {"success": True, "data": resp.json()}

            elif action == "delete":
                task_id = arguments.get("id", "")
                resp = await client.delete(f"{base}/api/tasks/{task_id}")
                resp.raise_for_status()
                return {"success": True, "data": {"deleted": task_id}}

            raise ValueError(f"Unknown action: {action}")

    async def _use_mock(self, action: str, arguments: dict[str, Any]) -> dict[str, Any]:
        """Fall back to mock in-memory task store."""
        global _mock_tasks

        if action == "list":
            tasks = list(_mock_tasks)
            task_filter = arguments.get("filter", {})
            if task_filter:
                tasks = self._apply_filter(tasks, task_filter)
            return {
                "success": True,
                "data": {
                    "tasks": tasks,
                    "count": len(tasks),
                    "source": "mock",
                },
            }

        elif action == "create":
            new_task = {
                "id": f"task-{str(uuid.uuid4())[:8]}",
                "title": arguments.get("title", "New Task"),
                "description": arguments.get("description", ""),
                "status": arguments.get("status", "todo"),
                "priority": arguments.get("priority", "medium"),
                "assignee": arguments.get("assignee"),
                "projectId": arguments.get("projectId", "proj-001"),
                "createdAt": datetime.utcnow().isoformat() + "Z",
                "dueDate": (datetime.utcnow() + timedelta(days=7)).isoformat() + "Z",
                "tags": arguments.get("tags", []),
            }
            _mock_tasks.append(new_task)
            return {"success": True, "data": new_task}

        elif action == "update":
            task_id = arguments.get("id", "")
            for task in _mock_tasks:
                if task["id"] == task_id:
                    for key in ("title", "description", "status", "priority", "assignee"):
                        if key in arguments:
                            task[key] = arguments[key]
                    return {"success": True, "data": task}
            return {"success": False, "error": f"Task {task_id} not found"}

        elif action == "update_batch":
            updates = arguments.get("updates", [])
            updated: list[dict[str, Any]] = []
            for upd in updates:
                title = upd.get("title", "")
                for task in _mock_tasks:
                    if task["title"].lower() == title.lower():
                        for key, val in upd.items():
                            if key != "title":
                                task[key] = val
                        updated.append(task)
                        break
            return {
                "success": True,
                "data": {
                    "updated": updated,
                    "count": len(updated),
                    "message": f"Updated {len(updated)} tasks",
                },
            }

        elif action == "assign":
            task_id = arguments.get("id", "")
            assignee = arguments.get("assignee", "Unassigned")
            for task in _mock_tasks:
                if task["id"] == task_id:
                    task["assignee"] = assignee
                    return {"success": True, "data": task}
            return {"success": False, "error": f"Task {task_id} not found"}

        elif action == "assign_batch":
            assignments = arguments.get("assignments", [])
            assigned: list[dict[str, Any]] = []
            for asgn in assignments:
                task_title = asgn.get("task", "")
                assignee = asgn.get("assignee", "")
                for task in _mock_tasks:
                    if task_title.lower() in task["title"].lower():
                        task["assignee"] = assignee
                        assigned.append(task)
                        break
            return {
                "success": True,
                "data": {
                    "assigned": assigned,
                    "count": len(assigned),
                    "message": f"Assigned {len(assigned)} tasks",
                },
            }

        elif action == "delete":
            task_id = arguments.get("id", "")
            for i, task in enumerate(_mock_tasks):
                if task["id"] == task_id:
                    _mock_tasks.pop(i)
                    return {"success": True, "data": {"deleted": task_id}}
            return {"success": False, "error": f"Task {task_id} not found"}

        return {"success": False, "error": f"Unknown action: {action}"}

    @staticmethod
    def _apply_filter(tasks: list[dict[str, Any]], task_filter: dict[str, Any]) -> list[dict[str, Any]]:
        """Filter tasks based on criteria."""
        result = tasks
        for key, value in task_filter.items():
            if value is None:
                result = [t for t in result if t.get(key) is None]
            else:
                result = [t for t in result if t.get(key) == value]
        return result
