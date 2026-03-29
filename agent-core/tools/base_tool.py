"""Base tool interface for the TaskPilot Agent."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class BaseTool(ABC):
    """Abstract base class for all agent tools.

    Every tool must define a name, description, and an async execute method.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Unique identifier for this tool."""
        ...

    @property
    @abstractmethod
    def description(self) -> str:
        """Human-readable description of what this tool does."""
        ...

    @property
    def parameters_schema(self) -> dict[str, Any]:
        """JSON Schema describing the tool's accepted arguments."""
        return {}

    @abstractmethod
    async def execute(self, arguments: dict[str, Any]) -> dict[str, Any]:
        """Execute the tool with the given arguments and return results.

        Args:
            arguments: Tool-specific arguments as a dict.

        Returns:
            A dict with at least a "success" key and either "data" or "error".
        """
        ...

    def validate_arguments(self, arguments: dict[str, Any]) -> tuple[bool, str]:
        """Validate arguments against the parameter schema.

        Returns:
            Tuple of (is_valid, error_message).
        """
        return True, ""
