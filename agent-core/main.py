"""FastAPI application for the TaskPilot Agent Core.

Provides HTTP and WebSocket endpoints for controlling the autonomous agent.
"""

from __future__ import annotations

import asyncio
import json
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from agent_loop import AgentLoop
from config import settings
from models import (
    AgentState,
    AgentStatusResponse,
    ActionHistoryResponse,
    RunRequest,
    RunResponse,
)

agent: AgentLoop | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    global agent
    agent = AgentLoop()
    print(f"TaskPilot Agent Core started on port {settings.AGENT_PORT}")
    print(f"LLM mode: {'OpenAI' if not settings.USE_MOCK_LLM else 'Rule-based (mock)'}")
    print(f"Available tools: {list(agent.tools.keys())}")
    yield
    print("TaskPilot Agent Core shutting down")


app = FastAPI(
    title="TaskPilot Agent Core",
    description="Autonomous project management AI agent with ReAct loop",
    version="1.0.0",
    lifespan=lifespan,
)

_allowed_origins = os.getenv("CORS_ORIGINS", "http://localhost:3200,http://localhost:5002,http://localhost:8082").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_agent() -> AgentLoop:
    """Get the singleton agent instance."""
    if agent is None:
        raise HTTPException(status_code=503, detail="Agent not initialized")
    return agent


@app.get("/")
async def root() -> dict[str, str]:
    """Health check endpoint."""
    return {
        "service": "TaskPilot Agent Core",
        "status": "running",
        "version": "1.0.0",
    }


@app.post("/agent/run", response_model=RunResponse)
async def run_agent(request: RunRequest) -> RunResponse:
    """Start the agent with a given instruction.

    The agent runs asynchronously. Use /agent/status or the WebSocket
    endpoint to monitor progress.
    """
    loop = get_agent()

    if loop.is_running:
        raise HTTPException(
            status_code=409,
            detail="Agent is already running. Stop the current session first.",
        )

    async def execute_in_background():
        await loop.run(request.instruction, request.autonomy_level)

    asyncio.create_task(execute_in_background())

    await asyncio.sleep(0.1)

    return RunResponse(
        session_id=loop.current_session.id if loop.current_session else "unknown",
        status=AgentState.THINKING,
        message=f"Agent started processing: {request.instruction}",
    )


@app.post("/agent/run-sync")
async def run_agent_sync(request: RunRequest) -> dict[str, Any]:
    """Run the agent synchronously and return the full session result.

    Useful for testing and simple integrations.
    """
    loop = get_agent()

    if loop.is_running:
        raise HTTPException(
            status_code=409,
            detail="Agent is already running.",
        )

    session = await loop.run(request.instruction, request.autonomy_level)

    return {
        "session_id": session.id,
        "state": session.state.value,
        "instruction": session.instruction,
        "steps": [
            {
                "iteration": step.iteration,
                "thought": {
                    "content": step.thought.content,
                    "reasoning": step.thought.reasoning,
                },
                "plan": {
                    "goal": step.plan.goal,
                    "steps": step.plan.steps,
                },
                "actions": [
                    {
                        "tool_name": a.tool_name,
                        "arguments": a.arguments,
                        "success": a.success,
                        "error": a.error,
                    }
                    for a in step.actions
                ],
                "observation": {
                    "content": step.observation.content,
                    "source": step.observation.source,
                },
                "is_final": step.is_final,
            }
            for step in session.steps
        ],
        "total_steps": len(session.steps),
        "started_at": session.started_at.isoformat() if session.started_at else None,
        "completed_at": session.completed_at.isoformat() if session.completed_at else None,
        "error": session.error,
    }


@app.get("/agent/status")
async def get_agent_status() -> dict[str, Any]:
    """Get the current agent status including session info and memory stats."""
    loop = get_agent()
    return loop.get_status()


@app.post("/agent/stop")
async def stop_agent() -> dict[str, str]:
    """Stop the currently running agent."""
    loop = get_agent()
    if not loop.is_running:
        raise HTTPException(status_code=400, detail="Agent is not running")
    loop.stop()
    return {"status": "stopping", "message": "Agent stop requested"}


@app.get("/agent/actions")
async def get_action_history() -> dict[str, Any]:
    """Get the history of all actions taken by the agent."""
    loop = get_agent()
    actions = loop.get_action_history()
    return {"actions": actions, "total": len(actions)}


@app.get("/agent/memory")
async def get_memory() -> dict[str, Any]:
    """Get all agent memories organized by tier."""
    loop = get_agent()
    return loop.memory.get_all_memories()


@app.post("/agent/memory")
async def add_memory(body: dict[str, Any]) -> dict[str, Any]:
    """Add a memory entry to the agent."""
    loop = get_agent()
    content = body.get("content", "")
    memory_type = body.get("memory_type", "long_term")
    metadata = body.get("metadata", {})

    if not content:
        raise HTTPException(status_code=400, detail="Content is required")

    if memory_type == "short_term":
        entry = loop.memory.store_short_term(content, metadata)
    elif memory_type == "working":
        entry = loop.memory.store_working(content, metadata)
    else:
        entry = loop.memory.store_long_term(content, metadata)

    return {
        "id": entry.id,
        "content": entry.content,
        "memory_type": entry.memory_type,
        "created_at": entry.created_at.isoformat(),
    }


@app.delete("/agent/memory/{memory_id}")
async def delete_memory(memory_id: str) -> dict[str, Any]:
    """Delete a specific memory entry."""
    loop = get_agent()
    deleted = loop.memory.delete_memory(memory_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Memory not found")
    return {"deleted": memory_id}


@app.put("/agent/memory/{memory_id}")
async def update_memory(memory_id: str, body: dict[str, Any]) -> dict[str, Any]:
    """Update a memory entry's content."""
    loop = get_agent()
    content = body.get("content", "")
    if not content:
        raise HTTPException(status_code=400, detail="Content is required")

    entry = loop.memory.update_memory(memory_id, content)
    if not entry:
        raise HTTPException(status_code=404, detail="Memory not found")

    return {
        "id": entry.id,
        "content": entry.content,
        "memory_type": entry.memory_type,
    }


@app.get("/agent/tools")
async def list_tools() -> dict[str, Any]:
    """List all available tools and their descriptions."""
    loop = get_agent()
    return {
        "tools": [
            {
                "name": tool.name,
                "description": tool.description,
                "parameters": tool.parameters_schema,
            }
            for tool in loop.tools.values()
        ],
    }


@app.websocket("/agent/stream")
async def agent_stream(websocket: WebSocket) -> None:
    """WebSocket endpoint for real-time agent event streaming.

    Events include: thought, plan, action, observation, state_change, complete, error.
    """
    await websocket.accept()
    loop = get_agent()
    queue = loop.subscribe_stream()

    try:
        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=30.0)
                await websocket.send_json({
                    "event_type": event.event_type,
                    "data": _serialize_event_data(event.data),
                    "timestamp": event.timestamp.isoformat(),
                })
            except asyncio.TimeoutError:
                await websocket.send_json({"event_type": "heartbeat", "data": {}, "timestamp": datetime.now(timezone.utc).isoformat()})
    except WebSocketDisconnect:
        pass
    finally:
        loop.unsubscribe_stream(queue)


def _serialize_event_data(data: dict[str, Any]) -> dict[str, Any]:
    """Ensure all event data values are JSON serializable."""
    result: dict[str, Any] = {}
    for key, value in data.items():
        if isinstance(value, datetime):
            result[key] = value.isoformat()
        elif isinstance(value, dict):
            result[key] = _serialize_event_data(value)
        elif isinstance(value, list):
            result[key] = [
                _serialize_event_data(v) if isinstance(v, dict) else str(v) if not isinstance(v, (str, int, float, bool, type(None))) else v
                for v in value
            ]
        elif isinstance(value, (str, int, float, bool, type(None))):
            result[key] = value
        else:
            result[key] = str(value)
    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.AGENT_PORT,
        reload=os.getenv("UVICORN_RELOAD", "false").lower() == "true",
    )
