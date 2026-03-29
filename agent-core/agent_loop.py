"""ReAct Agent Loop - the heart of the TaskPilot agent.

Implements the Reason -> Act -> Observe cycle with tool execution,
memory management, and real-time streaming.
"""

from __future__ import annotations

import asyncio
import json
import traceback
from datetime import datetime
from typing import Any, AsyncGenerator, Optional

from config import settings
from memory_manager import MemoryManager
from models import (
    Action,
    AgentSession,
    AgentState,
    AgentStep,
    Observation,
    StreamEvent,
    Thought,
)
from planner import Planner
from tools import (
    BaseTool,
    CodeAnalyzerTool,
    NotificationTool,
    ReportGeneratorTool,
    TaskManagerTool,
    WebSearcherTool,
)


class AgentLoop:
    """Autonomous ReAct agent that reasons, acts, and observes.

    The agent follows this cycle:
    1. Reason about the instruction and current context
    2. Plan which tools to use
    3. Execute the planned actions
    4. Observe the results
    5. Store in memory
    6. Check if the goal is complete
    """

    def __init__(self) -> None:
        self.planner = Planner()
        self.memory = MemoryManager()
        self.tools: dict[str, BaseTool] = {}
        self.current_session: Optional[AgentSession] = None
        self.state: AgentState = AgentState.IDLE
        self.is_running: bool = False
        self._action_history: list[Action] = []
        self._stream_listeners: list[asyncio.Queue[StreamEvent]] = []
        self._started_at: datetime = datetime.utcnow()

        self._register_tools()

    def _register_tools(self) -> None:
        """Register all available tools."""
        tool_instances: list[BaseTool] = [
            TaskManagerTool(),
            CodeAnalyzerTool(),
            ReportGeneratorTool(),
            WebSearcherTool(),
            NotificationTool(),
        ]
        for tool in tool_instances:
            self.tools[tool.name] = tool

    async def run(self, instruction: str, autonomy_level: str = "supervised") -> AgentSession:
        """Execute the full ReAct loop for a given instruction.

        Args:
            instruction: Natural language instruction from the user.
            autonomy_level: "supervised", "semi_autonomous", or "autonomous".

        Returns:
            The completed AgentSession with all steps.
        """
        self.current_session = AgentSession(
            instruction=instruction,
            state=AgentState.THINKING,
            started_at=datetime.utcnow(),
        )
        self.state = AgentState.THINKING
        self.is_running = True

        await self._emit_event("state_change", {
            "state": AgentState.THINKING.value,
            "instruction": instruction,
            "session_id": self.current_session.id,
        })

        self.memory.store_short_term(
            f"New instruction received: {instruction}",
            {"type": "instruction", "autonomy": autonomy_level},
        )

        observations: list[Observation] = []
        max_iter = settings.MAX_ITERATIONS

        try:
            for iteration in range(max_iter):
                if not self.is_running:
                    self.state = AgentState.STOPPED
                    self.current_session.state = AgentState.STOPPED
                    await self._emit_event("state_change", {"state": "stopped"})
                    break

                step = await self._execute_iteration(
                    instruction, observations, iteration, autonomy_level
                )
                self.current_session.steps.append(step)
                self.current_session.current_iteration = iteration + 1
                observations.append(step.observation)

                if step.is_final:
                    break

                await asyncio.sleep(0.3)

        except Exception as exc:
            self.state = AgentState.ERROR
            self.current_session.state = AgentState.ERROR
            self.current_session.error = str(exc)
            await self._emit_event("error", {
                "error": str(exc),
                "traceback": traceback.format_exc(),
            })

        else:
            self.state = AgentState.COMPLETED
            self.current_session.state = AgentState.COMPLETED
            self.current_session.completed_at = datetime.utcnow()
            await self._emit_event("complete", {
                "session_id": self.current_session.id,
                "total_steps": len(self.current_session.steps),
                "total_actions": sum(
                    len(s.actions) for s in self.current_session.steps
                ),
            })

        finally:
            self.is_running = False
            self.memory.store_long_term(
                f"Completed instruction: {instruction}. "
                f"Steps taken: {len(self.current_session.steps)}. "
                f"Final state: {self.current_session.state.value}.",
                {"type": "session_summary", "session_id": self.current_session.id},
            )

        return self.current_session

    async def _execute_iteration(
        self,
        instruction: str,
        observations: list[Observation],
        iteration: int,
        autonomy_level: str,
    ) -> AgentStep:
        """Execute a single iteration of the ReAct loop."""

        # 1. REASON
        self.state = AgentState.THINKING
        await self._emit_event("state_change", {"state": "thinking", "iteration": iteration})

        context = self.memory.get_context_window()
        thought = self.planner.reason(instruction, context, observations, iteration)

        await self._emit_event("thought", {
            "id": thought.id,
            "content": thought.content,
            "reasoning": thought.reasoning,
            "iteration": iteration,
        })

        await asyncio.sleep(0.5)

        # 2. PLAN
        self.state = AgentState.PLANNING
        await self._emit_event("state_change", {"state": "planning", "iteration": iteration})

        plan = self.planner.plan(thought, instruction, context)

        await self._emit_event("plan", {
            "id": plan.id,
            "goal": plan.goal,
            "steps": plan.steps,
            "tool_calls": [
                {"tool_name": tc.tool_name, "arguments": tc.arguments}
                for tc in plan.tool_calls
            ],
            "iteration": iteration,
        })

        await asyncio.sleep(0.3)

        # 3. ACT
        self.state = AgentState.ACTING
        await self._emit_event("state_change", {"state": "acting", "iteration": iteration})

        actions: list[Action] = []
        for tool_call in plan.tool_calls:
            action = await self._execute_tool(tool_call.tool_name, tool_call.arguments)
            actions.append(action)
            self._action_history.append(action)

            await self._emit_event("action", {
                "id": action.id,
                "tool_name": action.tool_name,
                "arguments": action.arguments,
                "success": action.success,
                "result_preview": str(action.result)[:300] if action.result else None,
                "error": action.error,
                "iteration": iteration,
            })

            await asyncio.sleep(0.2)

        # 4. OBSERVE
        self.state = AgentState.OBSERVING
        await self._emit_event("state_change", {"state": "observing", "iteration": iteration})

        observation = self._create_observation(actions)

        await self._emit_event("observation", {
            "id": observation.id,
            "content": observation.content,
            "source": observation.source,
            "iteration": iteration,
        })

        # 5. REMEMBER
        self.memory.store_interaction(
            thought=thought.reasoning,
            action="; ".join(f"{a.tool_name}({a.arguments})" for a in actions),
            observation=observation.content,
            metadata={"iteration": iteration, "instruction": instruction},
        )

        # 6. CHECK COMPLETION
        is_final = self.planner.check_completion(
            instruction, iteration + 1, observations + [observation], settings.MAX_ITERATIONS
        )

        return AgentStep(
            iteration=iteration,
            thought=thought,
            plan=plan,
            actions=actions,
            observation=observation,
            is_final=is_final,
        )

    async def _execute_tool(self, tool_name: str, arguments: dict[str, Any]) -> Action:
        """Execute a specific tool and return the action result."""
        tool = self.tools.get(tool_name)

        if tool is None:
            return Action(
                action_type="error",
                tool_name=tool_name,
                arguments=arguments,
                success=False,
                error=f"Tool '{tool_name}' not found. Available tools: {list(self.tools.keys())}",
            )

        try:
            result = await tool.execute(arguments)
            return Action(
                action_type=arguments.get("action", "execute"),
                tool_name=tool_name,
                arguments=arguments,
                result=result,
                success=result.get("success", False),
                error=result.get("error"),
            )
        except Exception as exc:
            return Action(
                action_type=arguments.get("action", "execute"),
                tool_name=tool_name,
                arguments=arguments,
                success=False,
                error=str(exc),
            )

    def _create_observation(self, actions: list[Action]) -> Observation:
        """Create an observation from action results."""
        successful = [a for a in actions if a.success]
        failed = [a for a in actions if not a.success]

        parts: list[str] = []

        for action in successful:
            result = action.result or {}
            data = result.get("data", {})

            if action.tool_name == "task_manager":
                act = action.arguments.get("action", "")
                if act == "list":
                    count = data.get("count", 0)
                    tasks = data.get("tasks", [])
                    task_summary = "; ".join(
                        f"{t.get('title', 'Unknown')} [{t.get('status', '?')}/{t.get('priority', '?')}]"
                        for t in tasks[:5]
                    )
                    parts.append(f"Listed {count} tasks: {task_summary}")
                elif act == "create":
                    parts.append(f"Created task: {data.get('title', 'Unknown')}")
                elif act in ("update", "update_batch"):
                    count = data.get("count", 1)
                    parts.append(f"Updated {count} task(s). {data.get('message', '')}")
                elif act in ("assign", "assign_batch"):
                    count = data.get("count", 1)
                    parts.append(f"Assigned {count} task(s). {data.get('message', '')}")
                else:
                    parts.append(f"Task manager action '{act}' completed.")

            elif action.tool_name == "report_generator":
                report_type = data.get("report_type", "status")
                metrics = data.get("metrics", {})
                parts.append(
                    f"Generated {report_type} report. "
                    f"Tasks: {metrics.get('total_tasks', 0)}, "
                    f"Completion: {metrics.get('completion_rate', 0)}%. "
                    f"{data.get('message', 'Report generated successfully. Triage complete.')}"
                )

            elif action.tool_name == "code_analyzer":
                act = action.arguments.get("action", "analyze")
                if act == "find_issues":
                    issues = data.get("issues", [])
                    parts.append(f"Found {len(issues)} code issues. "
                                 f"High: {data.get('by_severity', {}).get('high', 0)}, "
                                 f"Medium: {data.get('by_severity', {}).get('medium', 0)}")
                elif act == "metrics":
                    parts.append(f"Code quality score: {data.get('quality_score', 'N/A')}/100")
                else:
                    parts.append(f"Code analysis completed. Health: {data.get('overall_health', 'unknown')}")

            elif action.tool_name == "web_searcher":
                results = data.get("results", [])
                parts.append(f"Found {len(results)} search results for '{data.get('query', '')}'")

            elif action.tool_name == "notification":
                parts.append(f"Notification sent. {data.get('message', '')}")

            else:
                parts.append(f"{action.tool_name} completed successfully.")

        for action in failed:
            parts.append(f"FAILED: {action.tool_name} - {action.error}")

        content = " | ".join(parts) if parts else "No actions produced results."

        all_succeeded = len(failed) == 0 and len(successful) > 0
        if all_succeeded and any("complete" in p.lower() or "generated" in p.lower() for p in parts):
            content += " | Goal progress: completed successfully."

        return Observation(
            content=content,
            source="tool_execution",
            data={
                "successful_actions": len(successful),
                "failed_actions": len(failed),
                "tool_names": [a.tool_name for a in actions],
            },
        )

    def stop(self) -> None:
        """Stop the current agent execution."""
        self.is_running = False

    def get_status(self) -> dict[str, Any]:
        """Get the current agent status."""
        return {
            "state": self.state.value,
            "current_session": self.current_session.model_dump() if self.current_session else None,
            "total_actions": len(self._action_history),
            "uptime_seconds": (datetime.utcnow() - self._started_at).total_seconds(),
            "available_tools": list(self.tools.keys()),
            "memory_stats": {
                "short_term": len(self.memory.short_term),
                "working": len(self.memory.working),
                "long_term": len(self.memory.long_term),
            },
        }

    def get_action_history(self) -> list[dict[str, Any]]:
        """Get the history of all actions taken."""
        return [
            {
                "id": a.id,
                "action_type": a.action_type,
                "tool_name": a.tool_name,
                "arguments": a.arguments,
                "success": a.success,
                "error": a.error,
                "timestamp": a.timestamp.isoformat(),
            }
            for a in self._action_history
        ]

    def subscribe_stream(self) -> asyncio.Queue[StreamEvent]:
        """Subscribe to the real-time event stream."""
        queue: asyncio.Queue[StreamEvent] = asyncio.Queue()
        self._stream_listeners.append(queue)
        return queue

    def unsubscribe_stream(self, queue: asyncio.Queue[StreamEvent]) -> None:
        """Unsubscribe from the event stream."""
        if queue in self._stream_listeners:
            self._stream_listeners.remove(queue)

    async def _emit_event(self, event_type: str, data: dict[str, Any]) -> None:
        """Emit an event to all stream subscribers."""
        event = StreamEvent(event_type=event_type, data=data)
        for queue in self._stream_listeners:
            try:
                queue.put_nowait(event)
            except asyncio.QueueFull:
                pass
