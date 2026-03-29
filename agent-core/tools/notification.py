"""Notification tool for sending alerts and messages to team members."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from tools.base_tool import BaseTool


# In-memory notification log
_notification_log: list[dict[str, Any]] = []


class NotificationTool(BaseTool):
    """Sends notifications and alerts to team members and channels."""

    @property
    def name(self) -> str:
        return "notification"

    @property
    def description(self) -> str:
        return (
            "Send notifications, alerts, and messages to team members or channels. "
            "Supports different urgency levels and delivery channels."
        )

    @property
    def parameters_schema(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "enum": ["send", "send_batch", "list_sent", "clear"],
                },
                "message": {"type": "string"},
                "channel": {"type": "string"},
                "recipients": {"type": "array", "items": {"type": "string"}},
                "urgency": {
                    "type": "string",
                    "enum": ["low", "normal", "high", "critical"],
                },
                "notifications": {"type": "array"},
            },
            "required": ["action"],
        }

    async def execute(self, arguments: dict[str, Any]) -> dict[str, Any]:
        """Execute a notification action."""
        action = arguments.get("action", "send")

        if action == "send":
            return await self._send(arguments)
        elif action == "send_batch":
            return await self._send_batch(arguments)
        elif action == "list_sent":
            return await self._list_sent()
        elif action == "clear":
            return await self._clear()
        else:
            return {"success": False, "error": f"Unknown action: {action}"}

    async def _send(self, arguments: dict[str, Any]) -> dict[str, Any]:
        """Send a single notification."""
        message = arguments.get("message", "")
        channel = arguments.get("channel", "general")
        recipients = arguments.get("recipients", [])
        urgency = arguments.get("urgency", "normal")

        if not message:
            return {"success": False, "error": "Message is required"}

        notification = {
            "id": str(uuid.uuid4()),
            "message": message,
            "channel": channel,
            "recipients": recipients,
            "urgency": urgency,
            "sent_at": datetime.utcnow().isoformat(),
            "status": "delivered",
        }

        _notification_log.append(notification)

        return {
            "success": True,
            "data": {
                "notification": notification,
                "message": f"Notification sent to #{channel}" + (
                    f" ({len(recipients)} recipients)" if recipients else ""
                ),
            },
        }

    async def _send_batch(self, arguments: dict[str, Any]) -> dict[str, Any]:
        """Send multiple notifications at once."""
        notifications = arguments.get("notifications", [])
        sent: list[dict[str, Any]] = []

        for notif in notifications:
            result = await self._send(notif)
            if result["success"]:
                sent.append(result["data"]["notification"])

        return {
            "success": True,
            "data": {
                "sent": sent,
                "count": len(sent),
                "message": f"Sent {len(sent)} notifications",
            },
        }

    async def _list_sent(self) -> dict[str, Any]:
        """List all sent notifications."""
        return {
            "success": True,
            "data": {
                "notifications": _notification_log[-50:],
                "total": len(_notification_log),
            },
        }

    async def _clear(self) -> dict[str, Any]:
        """Clear notification log."""
        count = len(_notification_log)
        _notification_log.clear()
        return {
            "success": True,
            "data": {"cleared": count, "message": f"Cleared {count} notifications"},
        }
