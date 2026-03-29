"""Planner module for the TaskPilot Agent.

Responsible for analyzing instructions, generating reasoning,
and creating action plans with tool invocations.
"""

from __future__ import annotations

import json
import re
from typing import Any, Optional

from config import settings
from models import Action, Observation, Plan, Thought, ToolCall


class Planner:
    """Plans agent actions by reasoning about instructions and context.

    Uses either an LLM (OpenAI) or a rule-based fallback for generating
    thoughts, plans, and determining task completion.
    """

    def __init__(self) -> None:
        self._openai_client: Any = None
        if settings.OPENAI_API_KEY and not settings.USE_MOCK_LLM:
            try:
                from openai import OpenAI
                self._openai_client = OpenAI(
                    api_key=settings.OPENAI_API_KEY,
                    base_url=settings.OPENAI_BASE_URL,
                )
            except ImportError:
                pass

    def reason(
        self,
        instruction: str,
        context: str,
        observations: list[Observation],
        iteration: int,
    ) -> Thought:
        """Generate a thought by reasoning about the instruction and current context."""
        if self._openai_client:
            try:
                return self._llm_reason(instruction, context, observations, iteration)
            except Exception as e:
                if any(code in str(e) for code in ["402", "401", "insufficient_balance", "Insufficient Balance", "invalid_request_error"]):
                    self._openai_client = None  # disable LLM for this session
        return self._rule_based_reason(instruction, context, observations, iteration)

    def plan(self, thought: Thought, instruction: str, context: str) -> Plan:
        """Create an action plan based on the current thought."""
        if self._openai_client:
            try:
                return self._llm_plan(thought, instruction, context)
            except Exception as e:
                if any(code in str(e) for code in ["402", "401", "insufficient_balance", "Insufficient Balance", "invalid_request_error"]):
                    self._openai_client = None
        return self._rule_based_plan(thought, instruction, context)

    def check_completion(
        self,
        instruction: str,
        steps_taken: int,
        observations: list[Observation],
        max_iterations: int,
    ) -> bool:
        """Determine whether the agent's goal has been achieved."""
        if steps_taken >= max_iterations:
            return True

        if not observations:
            return False

        last_obs = observations[-1].content.lower()

        completion_signals = [
            "completed successfully",
            "all tasks done",
            "report generated",
            "triage complete",
            "assignment complete",
            "no more items",
            "nothing left to do",
            "goal achieved",
        ]
        if any(signal in last_obs for signal in completion_signals):
            return True

        if self._openai_client and steps_taken >= 2:
            return self._llm_check_completion(instruction, observations)

        return False

    def _llm_reason(
        self,
        instruction: str,
        context: str,
        observations: list[Observation],
        iteration: int,
    ) -> Thought:
        """Use LLM to generate reasoning about the current situation."""
        obs_text = "\n".join(
            f"  Observation {i + 1}: {o.content}" for i, o in enumerate(observations[-5:])
        )

        prompt = f"""You are TaskPilot, an autonomous project management AI agent.
You follow the ReAct pattern: Reason -> Act -> Observe.

Current instruction: {instruction}

Memory context:
{context}

Previous observations:
{obs_text if obs_text else "  None yet (first iteration)"}

Iteration: {iteration + 1}

Think step by step about:
1. What is the user asking for?
2. What have I learned from observations so far?
3. What should I do next?
4. What tools would be most helpful?

Provide your reasoning in a concise paragraph."""

        response = self._openai_client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=500,
            temperature=0.3,
        )

        reasoning = response.choices[0].message.content or "Unable to generate reasoning."

        return Thought(
            content=f"Iteration {iteration + 1}: Analyzing '{instruction}'",
            reasoning=reasoning,
        )

    def _rule_based_reason(
        self,
        instruction: str,
        context: str,
        observations: list[Observation],
        iteration: int,
    ) -> Thought:
        """Generate reasoning using rule-based heuristics."""
        instruction_lower = instruction.lower()
        obs_summary = "; ".join(o.content[:100] for o in observations[-3:]) if observations else "None"

        if iteration == 0:
            if "triage" in instruction_lower or "bug" in instruction_lower:
                reasoning = (
                    f"The user wants me to triage bugs. I need to first list all open tasks/bugs "
                    f"to understand the current state, then analyze each one and assign priorities. "
                    f"I'll start by fetching all tasks from the project management system."
                )
            elif "report" in instruction_lower:
                reasoning = (
                    f"The user wants a report generated. I need to gather project data including "
                    f"tasks, their statuses, and any blockers. Then I'll compile this into a "
                    f"structured report with metrics and recommendations."
                )
            elif "assign" in instruction_lower:
                reasoning = (
                    f"The user wants tasks assigned. I need to list unassigned tasks and available "
                    f"team members, then make smart assignments based on workload and expertise."
                )
            elif "status" in instruction_lower or "standup" in instruction_lower:
                reasoning = (
                    f"The user wants a status update or standup summary. I need to check all "
                    f"active tasks, recent completions, blockers, and upcoming deadlines."
                )
            elif "create" in instruction_lower and "task" in instruction_lower:
                reasoning = (
                    f"The user wants to create a new task. I'll parse the instruction for "
                    f"task details like title, description, priority, and assignee."
                )
            elif "analyze" in instruction_lower or "code" in instruction_lower:
                reasoning = (
                    f"The user wants code analysis. I'll examine the code structure, "
                    f"identify patterns, and look for potential issues or improvements."
                )
            else:
                reasoning = (
                    f"Processing instruction: '{instruction}'. I'll start by understanding "
                    f"the current project state and then determine the best course of action. "
                    f"First step is to gather relevant data."
                )
        else:
            reasoning = (
                f"Iteration {iteration + 1}. Previous observations: {obs_summary}. "
                f"Based on what I've learned, I need to continue working on: '{instruction}'. "
                f"Determining next steps based on accumulated context."
            )

        return Thought(
            content=f"Iteration {iteration + 1}: Working on '{instruction}'",
            reasoning=reasoning,
        )

    def _llm_plan(self, thought: Thought, instruction: str, context: str) -> Plan:
        """Use LLM to generate an action plan."""
        available_tools = [
            "task_manager: create, update, list, assign, delete tasks",
            "code_analyzer: analyze code structure, find issues, review patterns",
            "report_generator: generate status reports, sprint summaries",
            "web_searcher: search the web for information",
            "notification: send alerts and notifications to team members",
        ]

        prompt = f"""You are TaskPilot, planning actions for: {instruction}

Current reasoning: {thought.reasoning}

Context: {context}

Available tools:
{chr(10).join(f"- {t}" for t in available_tools)}

Create a plan with specific tool calls. Respond in JSON format:
{{
  "goal": "brief description of what we're trying to achieve",
  "steps": ["step 1 description", "step 2 description"],
  "tool_calls": [
    {{"tool_name": "tool_name_here", "arguments": {{"arg": "value"}}}}
  ]
}}

Only output valid JSON, no markdown formatting."""

        response = self._openai_client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=600,
            temperature=0.2,
        )

        raw = response.choices[0].message.content or "{}"
        raw = re.sub(r"```json\s*", "", raw)
        raw = re.sub(r"```\s*$", "", raw)

        try:
            plan_data = json.loads(raw)
        except json.JSONDecodeError:
            return self._rule_based_plan(thought, instruction, context)

        tool_calls = []
        for tc in plan_data.get("tool_calls", []):
            tool_calls.append(ToolCall(
                tool_name=tc.get("tool_name", "task_manager"),
                arguments=tc.get("arguments", {}),
            ))

        if not tool_calls:
            tool_calls = [ToolCall(tool_name="task_manager", arguments={"action": "list"})]

        return Plan(
            goal=plan_data.get("goal", instruction),
            steps=plan_data.get("steps", [instruction]),
            tool_calls=tool_calls,
        )

    def _rule_based_plan(self, thought: Thought, instruction: str, context: str) -> Plan:
        """Generate a plan using rule-based heuristics."""
        instruction_lower = instruction.lower()
        goal = instruction
        steps: list[str] = []
        tool_calls: list[ToolCall] = []

        if "triage" in instruction_lower or "bug" in instruction_lower:
            goal = "Triage open bugs and assign priorities"
            steps = [
                "List all open tasks and bugs",
                "Analyze each bug's severity and impact",
                "Assign priority levels (critical, high, medium, low)",
                "Update tasks with new priorities",
                "Send notification about triage results",
            ]
            tool_calls = [
                ToolCall(tool_name="task_manager", arguments={"action": "list", "filter": {"status": "open"}}),
                ToolCall(tool_name="task_manager", arguments={
                    "action": "update_batch",
                    "updates": [
                        {"title": "Fix login crash", "priority": "critical"},
                        {"title": "Update user profile UI", "priority": "medium"},
                        {"title": "Database connection timeout", "priority": "high"},
                    ],
                }),
                ToolCall(tool_name="notification", arguments={
                    "action": "send",
                    "message": "Bug triage completed. 3 bugs prioritized.",
                    "channel": "project-updates",
                }),
            ]

        elif "report" in instruction_lower:
            report_type = "weekly" if "weekly" in instruction_lower else "daily" if "daily" in instruction_lower else "status"
            goal = f"Generate {report_type} project report"
            steps = [
                "Gather all task data and metrics",
                "Analyze completion rates and blockers",
                "Generate formatted report",
                "Send report to stakeholders",
            ]
            tool_calls = [
                ToolCall(tool_name="task_manager", arguments={"action": "list"}),
                ToolCall(tool_name="report_generator", arguments={
                    "action": "generate",
                    "report_type": report_type,
                }),
                ToolCall(tool_name="notification", arguments={
                    "action": "send",
                    "message": f"{report_type.capitalize()} report has been generated.",
                    "channel": "reports",
                }),
            ]

        elif "assign" in instruction_lower:
            goal = "Assign unassigned tasks to team members"
            steps = [
                "List all unassigned tasks",
                "Analyze team member workload",
                "Make smart assignments based on capacity",
                "Notify team members of new assignments",
            ]
            tool_calls = [
                ToolCall(tool_name="task_manager", arguments={"action": "list", "filter": {"assignee": None}}),
                ToolCall(tool_name="task_manager", arguments={
                    "action": "assign_batch",
                    "assignments": [
                        {"task": "Fix login crash", "assignee": "Alice"},
                        {"task": "Update API docs", "assignee": "Bob"},
                    ],
                }),
                ToolCall(tool_name="notification", arguments={
                    "action": "send",
                    "message": "Tasks have been assigned to team members.",
                    "channel": "assignments",
                }),
            ]

        elif "status" in instruction_lower or "standup" in instruction_lower:
            goal = "Generate daily standup summary"
            steps = [
                "List all in-progress tasks",
                "Check for blockers and overdue items",
                "Compile standup summary",
                "Share with team",
            ]
            tool_calls = [
                ToolCall(tool_name="task_manager", arguments={"action": "list"}),
                ToolCall(tool_name="report_generator", arguments={
                    "action": "generate",
                    "report_type": "standup",
                }),
            ]

        elif "create" in instruction_lower and "task" in instruction_lower:
            title = self._extract_task_title(instruction)
            goal = f"Create new task: {title}"
            steps = [
                f"Create task: {title}",
                "Set initial priority and status",
            ]
            tool_calls = [
                ToolCall(tool_name="task_manager", arguments={
                    "action": "create",
                    "title": title,
                    "description": f"Task created from instruction: {instruction}",
                    "priority": "medium",
                    "status": "todo",
                }),
            ]

        elif "analyze" in instruction_lower or "code" in instruction_lower:
            goal = "Analyze code and identify issues"
            steps = [
                "Scan code structure",
                "Identify potential issues",
                "Generate recommendations",
            ]
            tool_calls = [
                ToolCall(tool_name="code_analyzer", arguments={
                    "action": "analyze",
                    "scope": "full",
                }),
            ]

        else:
            goal = instruction
            steps = [
                "Understand the request",
                "Gather relevant data",
                "Take appropriate action",
                "Verify results",
            ]
            tool_calls = [
                ToolCall(tool_name="task_manager", arguments={"action": "list"}),
            ]

        return Plan(goal=goal, steps=steps, tool_calls=tool_calls)

    def _llm_check_completion(self, instruction: str, observations: list[Observation]) -> bool:
        """Use LLM to determine if the goal has been achieved."""
        obs_text = "\n".join(f"- {o.content}" for o in observations[-5:])

        prompt = f"""Has this goal been achieved?
Goal: {instruction}

Observations so far:
{obs_text}

Answer with just "yes" or "no"."""

        response = self._openai_client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=10,
            temperature=0.1,
        )

        answer = (response.choices[0].message.content or "").strip().lower()
        return answer.startswith("yes")

    @staticmethod
    def _extract_task_title(instruction: str) -> str:
        """Extract a task title from a natural language instruction."""
        patterns = [
            r'create (?:a )?task[:\s]+["\']?(.+?)["\']?\s*$',
            r'add (?:a )?task[:\s]+["\']?(.+?)["\']?\s*$',
            r'new task[:\s]+["\']?(.+?)["\']?\s*$',
        ]
        for pattern in patterns:
            match = re.search(pattern, instruction, re.IGNORECASE)
            if match:
                return match.group(1).strip()

        words = instruction.split()
        start = 0
        for i, w in enumerate(words):
            if w.lower() in ("task", "create", "add", "new"):
                start = i + 1
        if start < len(words):
            return " ".join(words[start:]).strip("\"' ")
        return instruction[:80]
