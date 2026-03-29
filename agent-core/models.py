"""Data models for the TaskPilot Agent Core."""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


class AgentState(str, Enum):
    IDLE = "idle"
    THINKING = "thinking"
    PLANNING = "planning"
    ACTING = "acting"
    OBSERVING = "observing"
    COMPLETED = "completed"
    ERROR = "error"
    STOPPED = "stopped"


class ActionType(str, Enum):
    CREATE_TASK = "create_task"
    UPDATE_TASK = "update_task"
    ASSIGN_TASK = "assign_task"
    LIST_TASKS = "list_tasks"
    ANALYZE_CODE = "analyze_code"
    GENERATE_REPORT = "generate_report"
    SEARCH_WEB = "search_web"
    SEND_NOTIFICATION = "send_notification"
    TRIAGE_BUGS = "triage_bugs"


class ToolCall(BaseModel):
    tool_name: str
    arguments: dict[str, Any] = Field(default_factory=dict)


class Thought(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    content: str
    reasoning: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class Plan(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    goal: str
    steps: list[str]
    tool_calls: list[ToolCall]
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class Action(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    action_type: str
    tool_name: str
    arguments: dict[str, Any] = Field(default_factory=dict)
    result: Optional[Any] = None
    success: bool = True
    error: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class Observation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    content: str
    source: str
    data: Optional[dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class AgentStep(BaseModel):
    iteration: int
    thought: Thought
    plan: Plan
    actions: list[Action]
    observation: Observation
    is_final: bool = False


class MemoryEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    content: str
    memory_type: str  # "short_term", "working", "long_term"
    metadata: dict[str, Any] = Field(default_factory=dict)
    embedding: Optional[list[float]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    relevance_score: float = 0.0


class AgentSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    instruction: str
    state: AgentState = AgentState.IDLE
    steps: list[AgentStep] = Field(default_factory=list)
    current_iteration: int = 0
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error: Optional[str] = None


class RunRequest(BaseModel):
    instruction: str
    project_id: Optional[str] = None
    autonomy_level: str = "supervised"  # "supervised", "semi_autonomous", "autonomous"


class RunResponse(BaseModel):
    session_id: str
    status: AgentState
    message: str


class AgentStatusResponse(BaseModel):
    state: AgentState
    current_session: Optional[AgentSession] = None
    total_actions: int = 0
    uptime_seconds: float = 0.0


class ActionHistoryResponse(BaseModel):
    actions: list[Action]
    total: int


class StreamEvent(BaseModel):
    event_type: str  # "thought", "plan", "action", "observation", "state_change", "complete", "error"
    data: dict[str, Any]
    timestamp: datetime = Field(default_factory=datetime.utcnow)
