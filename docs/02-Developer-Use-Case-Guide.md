# TaskPilot: Developer Use Case Guide

## 1. Quick Start Guide

### Prerequisites

| Requirement | Version | Check Command |
|------------|---------|--------------|
| Node.js | 18+ | `node --version` |
| .NET SDK | 8.0+ | `dotnet --version` |
| Python | 3.11+ | `python3 --version` |
| Docker & Compose | Latest | `docker compose version` |
| Expo CLI | (optional) | `npx expo --version` |

### One-Command Launch

```bash
# Clone and enter the project
cd project-3-ai-agent-taskpilot

# (Optional) Set your OpenAI API key for LLM-powered reasoning
export OPENAI_API_KEY=sk-your-key-here

# Launch all 4 services
docker compose up --build
```

Once running:

| Service | URL | Purpose |
|---------|-----|---------|
| Web Dashboard | http://localhost:3002 | Main UI |
| Backend API | http://localhost:5002 | REST API + Swagger |
| Agent Core | http://localhost:8001 | Agent engine + docs |
| Mobile (web) | http://localhost:19006 | Expo web preview |

### First Run Notes

- The **agent works without an OpenAI key**. It uses rule-based heuristics for reasoning and planning. The LLM mode enhances the agent with GPT-4o-mini for open-ended instructions.
- The database is **automatically created and seeded** with 1 project and 8 tasks on first run.
- Visit http://localhost:5002/swagger for the interactive API documentation.
- Visit http://localhost:8001/docs for the FastAPI auto-generated documentation.

---

## 2. Local Development Setup

### Layer 1: Agent Core (Python)

```bash
cd agent-core

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# (Optional) Set environment variables
export OPENAI_API_KEY=sk-your-key     # Enable LLM mode
export DOTNET_API_URL=http://localhost:5002  # Backend URL
export AGENT_PORT=8001
export MAX_ITERATIONS=10

# Run with hot reload
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

Verify: `curl http://localhost:8001/` should return `{"service":"TaskPilot Agent Core","status":"running","version":"1.0.0"}`.

### Layer 2: Backend (.NET 8)

```bash
cd backend/TaskPilot.Api

# Restore NuGet packages
dotnet restore

# Run (listens on port 5002 per appsettings.json)
dotnet run
```

Verify: `curl http://localhost:5002/` should return `{"service":"TaskPilot API","status":"running","version":"1.0.0"}`.

### Layer 3: Frontend (Next.js)

```bash
cd frontend

# Install npm dependencies
npm install

# Run dev server (port 3002)
npm run dev
```

Open http://localhost:3002 in your browser.

**Environment Variables** (optional, defaults are set):
```bash
NEXT_PUBLIC_API_URL=http://localhost:5002    # Backend
NEXT_PUBLIC_AGENT_URL=http://localhost:8001  # Agent Core
```

### Layer 4: Mobile (Expo)

```bash
cd mobile

# Install npm dependencies
npm install

# Start Expo development server
npx expo start

# Or run directly on a platform:
npx expo start --ios       # iOS Simulator
npx expo start --android   # Android Emulator
npx expo start --web       # Web browser
```

**Note**: For the mobile app to connect to your local backend, update the API URLs in `mobile/src/lib/api.ts` to point to your machine's local IP instead of `localhost` when testing on a physical device.

---

## 3. Running the Project

### Giving the Agent Instructions

**From the Web Dashboard** (http://localhost:3002):
1. Type an instruction in the quick-command bar at the top of the dashboard.
2. Or use one of the preset buttons: "Triage Bugs", "Weekly Report", "Assign Tasks", "Code Analysis".
3. Or navigate to the **Chat** page for a conversational interface.

**From the API directly**:
```bash
# Synchronous execution (waits for completion)
curl -X POST http://localhost:8001/agent/run-sync \
  -H "Content-Type: application/json" \
  -d '{"instruction": "Triage all open bugs and assign priorities"}'

# Asynchronous execution (returns immediately)
curl -X POST http://localhost:8001/agent/run \
  -H "Content-Type: application/json" \
  -d '{"instruction": "Generate a weekly status report", "autonomy_level": "supervised"}'
```

**From the Mobile App**:
Use the "Quick Actions" tab or the "Agent Chat" tab.

### Watching the Agent Reason

On the **Chat** page, after sending an instruction, the agent's full reasoning process is rendered:

1. **Amber panel** -- Thinking: Shows the agent's reasoning about the instruction and context.
2. **Violet panel** -- Planning: Shows the goal, numbered sub-steps, and planned tool calls.
3. **Blue panel** -- Acting: Shows each tool invocation with its arguments (JSON), tool name, and success/failure badge.
4. **Emerald panel** -- Observing: Shows the synthesized observation and, if the goal is achieved, a "Goal Achieved" badge.

### Interacting with the Kanban Board

Navigate to the **Tasks** page (http://localhost:3002/tasks):
- **Drag and drop** tasks between columns to change their status.
- Click **Add Task** to create a new task with title and priority.
- Click the **X** button on a task card to delete it.
- Tasks are grouped into 4 columns: To Do, In Progress, Done, Blocked.

### Using the Memory Viewer

Navigate to the **Memory** page (http://localhost:3002/memory):
- Switch between Short-term, Working, and Long-term tabs.
- Click **Add Memory** to manually inject a memory entry.
- Click the edit icon to modify an entry's content.
- Click the trash icon to delete an entry.
- Watch memory counts grow as the agent processes instructions.

---

## 4. Project Structure Deep Dive

```
project-3-ai-agent-taskpilot/
|
|-- agent-core/                          # Python Agent Core (FastAPI)
|   |-- main.py                          # FastAPI app, HTTP + WebSocket endpoints
|   |-- agent_loop.py                    # ReAct loop engine (6-phase cycle)
|   |-- planner.py                       # Dual-mode planner (LLM + rule-based)
|   |-- memory_manager.py               # 3-tier memory system
|   |-- models.py                        # Pydantic data models (13 classes)
|   |-- config.py                        # Environment-based settings
|   |-- requirements.txt                 # Python dependencies (12 packages)
|   |-- Dockerfile                       # Python 3.11-slim container
|   |-- tools/
|       |-- __init__.py                  # Tool package exports
|       |-- base_tool.py                 # Abstract base class for all tools
|       |-- task_manager.py              # Task CRUD + mock data (8 tasks)
|       |-- code_analyzer.py             # Code analysis + metrics + issues
|       |-- report_generator.py          # 5 report types with Markdown output
|       |-- web_searcher.py              # Web search + knowledge base
|       |-- notification.py              # Notification sending + logging
|
|-- backend/                             # .NET 8 Backend API
|   |-- TaskPilot.sln                    # Visual Studio solution file
|   |-- Dockerfile                       # Multi-stage .NET build
|   |-- TaskPilot.Api/
|       |-- Program.cs                   # App startup, DI, middleware pipeline
|       |-- appsettings.json             # Configuration (ports, DB, agent URL)
|       |-- TaskPilot.Api.csproj         # Project file (EF Core, SignalR)
|       |-- Controllers/
|       |   |-- AgentController.cs       # Agent run/stop/status/sessions/actions
|       |   |-- TasksController.cs       # Task CRUD with SignalR broadcasting
|       |   |-- ProjectsController.cs    # Project CRUD with Include()
|       |   |-- MemoryController.cs      # Dual-source memory management
|       |   |-- ReportsController.cs     # Report listing + generation
|       |-- Services/
|       |   |-- AgentOrchestratorService.cs  # Agent-backend communication
|       |   |-- TaskManagementService.cs     # Task business logic + stats
|       |   |-- ReportService.cs             # Report generation from task data
|       |-- Models/
|       |   |-- Project.cs               # Project entity + DTOs
|       |   |-- TaskItem.cs              # Task entity + DTOs
|       |   |-- AgentSession.cs          # Session entity + DTOs
|       |   |-- AgentAction.cs           # Action entity
|       |   |-- Memory.cs                # Memory entity + DTOs
|       |   |-- Report.cs                # Report entity
|       |-- Data/
|       |   |-- AppDbContext.cs           # EF Core DbContext + seed data
|       |-- Hubs/
|           |-- AgentHub.cs              # SignalR hub for real-time updates
|
|-- frontend/                            # Next.js 14 Web Frontend
|   |-- Dockerfile                       # Node 18 Alpine build
|   |-- package.json                     # Dependencies (Next, React, SignalR)
|   |-- next.config.js                   # API proxy rewrites
|   |-- tailwind.config.ts               # Custom colors (primary, agent states)
|   |-- tsconfig.json                    # TypeScript config with path aliases
|   |-- postcss.config.js               # PostCSS with Tailwind + Autoprefixer
|   |-- src/
|       |-- app/
|       |   |-- layout.tsx               # Root layout (Sidebar + Header + main)
|       |   |-- page.tsx                 # Dashboard (quick commands + widgets)
|       |   |-- chat/page.tsx            # Chat page wrapper
|       |   |-- tasks/page.tsx           # Tasks page wrapper
|       |   |-- memory/page.tsx          # Memory page wrapper
|       |   |-- reports/page.tsx         # Reports page wrapper
|       |-- components/
|       |   |-- layout/
|       |   |   |-- Sidebar.tsx          # 5-item navigation with icons
|       |   |   |-- Header.tsx           # Agent state indicator + action count
|       |   |-- dashboard/
|       |   |   |-- AgentStatus.tsx      # Agent state, memory stats, tools
|       |   |   |-- ProjectHealth.tsx    # Health score gauge + metrics
|       |   |   |-- ActionTimeline.tsx   # Recent action feed
|       |   |-- chat/
|       |   |   |-- AgentChat.tsx        # Chat interface + reasoning display
|       |   |   |-- ReasoningStep.tsx    # 4-phase reasoning visualization
|       |   |   |-- ActionCard.tsx       # Tool execution card
|       |   |-- tasks/
|       |   |   |-- KanbanBoard.tsx      # Drag-and-drop Kanban
|       |   |   |-- TaskCard.tsx         # Draggable task card
|       |   |-- memory/
|       |   |   |-- MemoryViewer.tsx     # 3-tier memory browser + CRUD
|       |   |-- reports/
|       |       |-- ReportCard.tsx       # Report list + Markdown renderer
|       |-- lib/
|       |   |-- api.ts                   # API client (20+ functions)
|       |   |-- types.ts                 # TypeScript interfaces (15 types)
|       |-- styles/
|           |-- globals.css              # Tailwind layers + component classes
|
|-- mobile/                              # React Native / Expo Mobile App
|   |-- App.tsx                          # App entry with NavigationContainer
|   |-- app.json                         # Expo configuration
|   |-- Dockerfile                       # Node 18 Alpine + Expo web
|   |-- package.json                     # Dependencies (Expo, Navigation)
|   |-- tsconfig.json                    # TypeScript config
|   |-- src/
|       |-- navigation/
|       |   |-- AppNavigator.tsx         # Bottom tab navigator (4 tabs)
|       |-- screens/
|       |   |-- TaskFeed.tsx             # Task list with filters + status update
|       |   |-- AgentChat.tsx            # Chat with quick suggestions
|       |   |-- QuickActions.tsx         # 8 action buttons with feedback
|       |   |-- Notifications.tsx        # Mock notification feed
|       |-- components/
|       |   |-- TaskItem.tsx             # Task card with badges
|       |   |-- ChatBubble.tsx           # User/agent message bubbles
|       |   |-- ActionButton.tsx         # Color-coded action trigger
|       |-- lib/
|           |-- api.ts                   # Mobile API client (4 functions)
|           |-- types.ts                 # Mobile TypeScript types
|
|-- docker-compose.yml                   # 4-service orchestration
|-- README.md                            # Project overview
|-- docs/                                # This documentation
```

---

## 5. API Reference

### 5.1 Backend API (Port 5002)

#### Projects

| Method | Endpoint | Description |
|--------|---------|-------------|
| `GET` | `/api/projects` | List all projects (with tasks) |
| `GET` | `/api/projects/{id}` | Get project by ID (with tasks + reports) |
| `POST` | `/api/projects` | Create a project |
| `PUT` | `/api/projects/{id}` | Update a project |
| `DELETE` | `/api/projects/{id}` | Delete a project (cascades) |

#### Tasks

| Method | Endpoint | Query Params | Description |
|--------|---------|-------------|-------------|
| `GET` | `/api/tasks` | `projectId`, `status`, `priority`, `assignee` | List tasks with filters |
| `GET` | `/api/tasks/{id}` | | Get task by ID |
| `GET` | `/api/tasks/stats` | `projectId` | Aggregated statistics |
| `POST` | `/api/tasks` | | Create a task |
| `PUT` | `/api/tasks/{id}` | | Update a task |
| `PUT` | `/api/tasks/{id}/status` | | Update status only |
| `PUT` | `/api/tasks/{id}/assign` | | Assign to user |
| `DELETE` | `/api/tasks/{id}` | | Delete a task |

**Task Stats Response**:
```json
{
  "total": 8,
  "byStatus": { "todo": 2, "open": 3, "inProgress": 2, "done": 1, "blocked": 0 },
  "byPriority": { "critical": 1, "high": 3, "medium": 2, "low": 2 },
  "unassigned": 4,
  "completionRate": 12.5,
  "overdueCount": 2
}
```

#### Agent

| Method | Endpoint | Description |
|--------|---------|-------------|
| `POST` | `/api/agent/run` | Start agent with instruction |
| `GET` | `/api/agent/status` | Get agent status (proxied from agent core) |
| `POST` | `/api/agent/stop` | Stop running agent |
| `GET` | `/api/agent/sessions?limit=20` | Session history |
| `GET` | `/api/agent/actions?limit=50` | Action history |

**Run Request Body**:
```json
{
  "instruction": "Triage all open bugs",
  "projectId": "proj-001",
  "autonomyLevel": "supervised"
}
```

#### Memory

| Method | Endpoint | Description |
|--------|---------|-------------|
| `GET` | `/api/memory?memoryType=long_term` | List memories by type |
| `GET` | `/api/memory/{id}` | Get memory by ID |
| `POST` | `/api/memory` | Add memory entry |
| `PUT` | `/api/memory/{id}` | Update memory content |
| `DELETE` | `/api/memory/{id}` | Delete memory entry |

#### Reports

| Method | Endpoint | Description |
|--------|---------|-------------|
| `GET` | `/api/reports?projectId=&reportType=` | List reports |
| `GET` | `/api/reports/{id}` | Get report by ID |
| `POST` | `/api/reports/generate` | Generate a new report |
| `DELETE` | `/api/reports/{id}` | Delete a report |

### 5.2 Agent Core API (Port 8001)

| Method | Endpoint | Description |
|--------|---------|-------------|
| `GET` | `/` | Health check |
| `POST` | `/agent/run` | Start async agent execution |
| `POST` | `/agent/run-sync` | Execute agent synchronously |
| `GET` | `/agent/status` | Full status with memory stats |
| `POST` | `/agent/stop` | Stop running agent |
| `GET` | `/agent/actions` | Action history |
| `GET` | `/agent/memory` | All memories (3 tiers) |
| `POST` | `/agent/memory` | Add memory entry |
| `PUT` | `/agent/memory/{id}` | Update memory |
| `DELETE` | `/agent/memory/{id}` | Delete memory |
| `GET` | `/agent/tools` | List available tools |
| `WS` | `/agent/stream` | Real-time event stream |

### 5.3 WebSocket Events

Connect to `ws://localhost:8001/agent/stream` to receive real-time events:

| Event Type | Payload Fields |
|-----------|---------------|
| `state_change` | `state`, `iteration`, `instruction`, `session_id` |
| `thought` | `id`, `content`, `reasoning`, `iteration` |
| `plan` | `id`, `goal`, `steps[]`, `tool_calls[]`, `iteration` |
| `action` | `id`, `tool_name`, `arguments`, `success`, `result_preview`, `error`, `iteration` |
| `observation` | `id`, `content`, `source`, `iteration` |
| `complete` | `session_id`, `total_steps`, `total_actions` |
| `error` | `error`, `traceback` |
| `heartbeat` | (empty) |

### 5.4 SignalR Events (Port 5002)

Connect to `http://localhost:5002/hubs/agent`:

| Event | When |
|-------|------|
| `Connected` | On connection, with connectionId |
| `AgentStateChanged` | Agent session started/completed |
| `TaskCreated` | New task created |
| `TaskUpdated` | Task modified |
| `TaskAssigned` | Task assigned to user |
| `TaskDeleted` | Task removed |
| `SubscribedToSession` | After subscribing to a session |
| `UserMessage` | When SendMessage is invoked |

---

## 6. Optimization Opportunities

### 6.1 Upgrading to a Real LLM

The agent already supports OpenAI out of the box. To enable it, just set the environment variable:

```bash
export OPENAI_API_KEY=sk-your-key-here
```

To use a different provider (Claude, local Ollama), modify `planner.py`:

```python
# planner.py - Replace the OpenAI initialization with Anthropic

class Planner:
    def __init__(self) -> None:
        self._client = None
        if settings.ANTHROPIC_API_KEY and not settings.USE_MOCK_LLM:
            try:
                from anthropic import Anthropic
                self._client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
            except ImportError:
                pass

    def _llm_reason(self, instruction, context, observations, iteration):
        obs_text = "\n".join(
            f"  Observation {i+1}: {o.content}" for i, o in enumerate(observations[-5:])
        )
        prompt = f"""You are TaskPilot, an autonomous project management AI agent.
Current instruction: {instruction}

Memory context:
{context}

Previous observations:
{obs_text if obs_text else "  None yet"}

Iteration: {iteration + 1}

Think step by step about what to do next."""

        message = self._client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}],
        )
        reasoning = message.content[0].text
        return Thought(
            content=f"Iteration {iteration + 1}: Analyzing '{instruction}'",
            reasoning=reasoning,
        )
```

For **local Ollama** (no API key needed):

```python
# config.py - Add Ollama settings
OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3.1")

# planner.py - Use Ollama via OpenAI-compatible API
from openai import OpenAI

self._openai_client = OpenAI(
    base_url=f"{settings.OLLAMA_BASE_URL}/v1",
    api_key="ollama",  # Ollama doesn't require a real key
)
```

### 6.2 Adding New Tools to the Agent

Follow this step-by-step template to add a new tool:

**Step 1**: Create the tool file in `agent-core/tools/`:

```python
# agent-core/tools/calendar_tool.py
"""Calendar tool for managing deadlines and scheduling."""

from __future__ import annotations
from datetime import datetime, timedelta
from typing import Any
from tools.base_tool import BaseTool


class CalendarTool(BaseTool):
    """Manages calendar events, deadlines, and schedules."""

    @property
    def name(self) -> str:
        return "calendar"

    @property
    def description(self) -> str:
        return "Manage calendar events, check deadlines, and schedule meetings."

    @property
    def parameters_schema(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "enum": ["list_events", "check_deadlines", "schedule"],
                },
                "date_range": {"type": "string"},
                "title": {"type": "string"},
            },
            "required": ["action"],
        }

    async def execute(self, arguments: dict[str, Any]) -> dict[str, Any]:
        action = arguments.get("action", "list_events")

        if action == "list_events":
            return {
                "success": True,
                "data": {
                    "events": [
                        {"title": "Sprint Planning", "date": "2026-03-16", "time": "10:00"},
                        {"title": "Design Review", "date": "2026-03-17", "time": "14:00"},
                    ],
                    "count": 2,
                },
            }
        elif action == "check_deadlines":
            return {
                "success": True,
                "data": {
                    "upcoming": 3,
                    "overdue": 1,
                    "message": "1 deadline is overdue. 3 coming up this week.",
                },
            }
        else:
            return {"success": False, "error": f"Unknown action: {action}"}
```

**Step 2**: Register the tool in `agent-core/tools/__init__.py`:

```python
from tools.calendar_tool import CalendarTool

__all__ = [
    # ... existing exports ...
    "CalendarTool",
]
```

**Step 3**: Add to the agent loop in `agent-core/agent_loop.py`:

```python
from tools import CalendarTool  # Add to imports

def _register_tools(self) -> None:
    tool_instances: list[BaseTool] = [
        TaskManagerTool(),
        CodeAnalyzerTool(),
        ReportGeneratorTool(),
        WebSearcherTool(),
        NotificationTool(),
        CalendarTool(),  # Add new tool
    ]
```

**Step 4**: Add observation handling in `_create_observation()`:

```python
elif action.tool_name == "calendar":
    act = action.arguments.get("action", "")
    if act == "check_deadlines":
        parts.append(f"Deadline check: {data.get('message', '')}")
    else:
        parts.append(f"Calendar action '{act}' completed.")
```

**Step 5**: Add rule-based plan support in `planner.py` (for mock LLM mode):

```python
elif "deadline" in instruction_lower or "calendar" in instruction_lower:
    goal = "Check upcoming deadlines and schedule"
    steps = ["Check all upcoming deadlines", "Identify overdue items"]
    tool_calls = [
        ToolCall(tool_name="calendar", arguments={"action": "check_deadlines"}),
    ]
```

### 6.3 Improving Memory with Vector Embeddings

Replace the hash-based embeddings with real vector search using FAISS or ChromaDB:

```python
# memory_manager.py - FAISS-powered long-term memory

import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

class MemoryManager:
    def __init__(self) -> None:
        self.short_term: list[MemoryEntry] = []
        self.working: list[MemoryEntry] = []
        self.long_term: list[MemoryEntry] = []

        # Initialize embedding model and FAISS index
        self._model = SentenceTransformer("all-MiniLM-L6-v2")  # 384-dim
        self._index = faiss.IndexFlatIP(384)  # Inner product (cosine after normalization)
        self._long_term_ids: list[str] = []

    def _compute_embedding(self, text: str) -> list[float]:
        embedding = self._model.encode(text, normalize_embeddings=True)
        return embedding.tolist()

    def store_long_term(self, content: str, metadata=None) -> MemoryEntry:
        embedding = self._compute_embedding(content)
        entry = MemoryEntry(
            content=content,
            memory_type="long_term",
            metadata=metadata or {},
            embedding=embedding,
        )
        self.long_term.append(entry)
        self._long_term_ids.append(entry.id)

        # Add to FAISS index
        vector = np.array([embedding], dtype=np.float32)
        self._index.add(vector)

        return entry

    def retrieve_relevant(self, query: str, top_k: int = 5) -> list[MemoryEntry]:
        query_embedding = self._compute_embedding(query)
        query_vector = np.array([query_embedding], dtype=np.float32)

        # Search FAISS index
        scores, indices = self._index.search(query_vector, min(top_k, self._index.ntotal))

        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx >= 0 and idx < len(self.long_term):
                entry = self.long_term[idx]
                entry.relevance_score = float(score)
                results.append(entry)

        return results
```

Add to `requirements.txt`:
```
faiss-cpu==1.7.4
sentence-transformers==2.5.0
```

### 6.4 Adding Human-in-the-Loop Approval

Implement an approval gate before the agent executes high-risk actions:

```python
# agent_loop.py - Add approval workflow

async def _execute_iteration(self, instruction, observations, iteration, autonomy_level):
    # ... existing Reason and Plan phases ...

    # 3. ACT (with approval gate)
    self.state = AgentState.ACTING

    actions: list[Action] = []
    for tool_call in plan.tool_calls:
        # Check if this action requires approval
        if self._requires_approval(tool_call, autonomy_level):
            await self._emit_event("approval_required", {
                "tool_name": tool_call.tool_name,
                "arguments": tool_call.arguments,
                "iteration": iteration,
            })

            # Wait for approval (with timeout)
            approved = await self._wait_for_approval(timeout=300)
            if not approved:
                actions.append(Action(
                    action_type="skipped",
                    tool_name=tool_call.tool_name,
                    arguments=tool_call.arguments,
                    success=False,
                    error="Action not approved by user",
                ))
                continue

        action = await self._execute_tool(tool_call.tool_name, tool_call.arguments)
        actions.append(action)

    # ... rest of iteration ...

def _requires_approval(self, tool_call: ToolCall, autonomy_level: str) -> bool:
    """Determine if a tool call needs human approval."""
    if autonomy_level == "autonomous":
        return False  # No approvals needed

    high_risk_actions = {
        "task_manager": ["delete", "update_batch", "assign_batch"],
        "notification": ["send_batch"],
    }

    tool_actions = high_risk_actions.get(tool_call.tool_name, [])
    action = tool_call.arguments.get("action", "")

    if autonomy_level == "supervised":
        return True  # All actions need approval
    elif autonomy_level == "semi_autonomous":
        return action in tool_actions  # Only high-risk actions

    return False

async def _wait_for_approval(self, timeout: float = 300) -> bool:
    """Wait for user approval via WebSocket."""
    approval_queue: asyncio.Queue[bool] = asyncio.Queue()
    self._pending_approval = approval_queue
    try:
        return await asyncio.wait_for(approval_queue.get(), timeout=timeout)
    except asyncio.TimeoutError:
        return False
    finally:
        self._pending_approval = None
```

### 6.5 Implementing Parallel Tool Execution

Execute independent tool calls concurrently:

```python
# agent_loop.py - Replace sequential execution with parallel

import asyncio

async def _execute_iteration(self, instruction, observations, iteration, autonomy_level):
    # ... Reason and Plan phases ...

    # 3. ACT (parallel execution)
    self.state = AgentState.ACTING
    await self._emit_event("state_change", {"state": "acting", "iteration": iteration})

    # Execute all tool calls concurrently
    tasks = [
        self._execute_tool(tc.tool_name, tc.arguments)
        for tc in plan.tool_calls
    ]
    actions = await asyncio.gather(*tasks, return_exceptions=True)

    # Convert exceptions to failed Actions
    resolved_actions: list[Action] = []
    for i, result in enumerate(actions):
        if isinstance(result, Exception):
            resolved_actions.append(Action(
                action_type="error",
                tool_name=plan.tool_calls[i].tool_name,
                arguments=plan.tool_calls[i].arguments,
                success=False,
                error=str(result),
            ))
        else:
            resolved_actions.append(result)
            self._action_history.append(result)

    # Emit events for each action
    for action in resolved_actions:
        await self._emit_event("action", {
            "id": action.id,
            "tool_name": action.tool_name,
            "success": action.success,
            "iteration": iteration,
        })

    # ... Observe, Remember, Check phases ...
```

### 6.6 Frontend: Streaming Agent Reasoning with SSE

Add Server-Sent Events for real-time reasoning visualization:

```typescript
// frontend/src/lib/stream.ts

export function streamAgentEvents(
  onEvent: (event: { event_type: string; data: Record<string, unknown> }) => void,
  onError?: (error: Error) => void
): () => void {
  const ws = new WebSocket("ws://localhost:8001/agent/stream");

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onEvent(data);
    } catch (err) {
      console.error("Failed to parse event:", err);
    }
  };

  ws.onerror = (event) => {
    onError?.(new Error("WebSocket error"));
  };

  // Return cleanup function
  return () => ws.close();
}

// Usage in AgentChat.tsx:
import { streamAgentEvents } from "@/lib/stream";

// Inside the component:
useEffect(() => {
  const cleanup = streamAgentEvents((event) => {
    if (event.event_type === "thought") {
      setCurrentThought(event.data.reasoning as string);
    } else if (event.event_type === "action") {
      setCurrentAction(event.data);
    } else if (event.event_type === "state_change") {
      setAgentState(event.data.state as AgentState);
    }
  });

  return cleanup;
}, []);
```

### 6.7 Mobile: Push Notifications with Expo

```typescript
// mobile/src/lib/notifications.ts

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log("Push notifications require a physical device");
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "TaskPilot Notifications",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}

export async function sendLocalNotification(title: string, body: string) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: null, // Send immediately
  });
}
```

### 6.8 Backend: Agent Session Persistence and Recovery

Add session checkpointing to resume interrupted agent runs:

```csharp
// Backend/TaskPilot.Api/Services/AgentOrchestratorService.cs

public async Task<AgentSession?> ResumeSessionAsync(string sessionId)
{
    var session = await _db.AgentSessions
        .Include(s => s.Actions)
        .FirstOrDefaultAsync(s => s.Id == sessionId);

    if (session == null || session.State is "completed" or "error")
        return null;

    // Reconstruct the instruction and send to agent core
    var agentBaseUrl = _config["AgentCore:BaseUrl"] ?? "http://localhost:8001";
    var client = _httpClientFactory.CreateClient();

    var requestBody = new
    {
        instruction = $"Resume: {session.Instruction}",
        autonomy_level = session.AutonomyLevel,
        // Pass previous actions as context
        context = session.StepsJson
    };

    var content = new StringContent(
        JsonSerializer.Serialize(requestBody),
        Encoding.UTF8,
        "application/json"
    );

    var response = await client.PostAsync($"{agentBaseUrl}/agent/run-sync", content);
    // ... process response and update session ...

    return session;
}
```

---

## 7. Training and Fine-Tuning the Agent

### Customizing for Specific Domains

The rule-based planner can be extended with domain-specific keyword patterns:

```python
# planner.py - Add a domain-specific handler

# In _rule_based_plan():
elif "security" in instruction_lower or "vulnerability" in instruction_lower:
    goal = "Security audit and vulnerability assessment"
    steps = [
        "Scan codebase for security vulnerabilities",
        "Check dependency versions for known CVEs",
        "Review authentication and authorization patterns",
        "Generate security audit report",
    ]
    tool_calls = [
        ToolCall(tool_name="code_analyzer", arguments={"action": "find_issues", "scope": "full"}),
        ToolCall(tool_name="web_searcher", arguments={"action": "search", "query": "security vulnerability scanning best practices"}),
        ToolCall(tool_name="report_generator", arguments={"action": "generate", "report_type": "status"}),
    ]
```

### Creating Training Data from Interaction Logs

Export agent sessions as training data for fine-tuning:

```python
# agent-core/export_training_data.py

import json
from datetime import datetime

def export_sessions_as_training_data(sessions: list) -> list[dict]:
    """Convert agent sessions into instruction-following training pairs."""
    training_data = []

    for session in sessions:
        if session.get("state") != "completed":
            continue

        instruction = session["instruction"]
        steps = session.get("steps", [])

        for step in steps:
            # Create a training example for reasoning
            training_data.append({
                "messages": [
                    {
                        "role": "system",
                        "content": "You are TaskPilot, an autonomous project management AI agent."
                    },
                    {
                        "role": "user",
                        "content": f"Instruction: {instruction}\nIteration: {step['iteration'] + 1}"
                    },
                    {
                        "role": "assistant",
                        "content": step["thought"]["reasoning"]
                    }
                ]
            })

            # Create a training example for planning
            plan = step["plan"]
            training_data.append({
                "messages": [
                    {
                        "role": "system",
                        "content": "Generate a tool execution plan as JSON."
                    },
                    {
                        "role": "user",
                        "content": f"Goal: {plan['goal']}\nReasoning: {step['thought']['reasoning']}"
                    },
                    {
                        "role": "assistant",
                        "content": json.dumps({
                            "goal": plan["goal"],
                            "steps": plan["steps"],
                            "tool_calls": [
                                {"tool_name": a["tool_name"], "arguments": a["arguments"]}
                                for a in step["actions"]
                            ]
                        })
                    }
                ]
            })

    return training_data

# Usage:
# data = export_sessions_as_training_data(all_sessions)
# with open("training_data.jsonl", "w") as f:
#     for item in data:
#         f.write(json.dumps(item) + "\n")
```

### Fine-Tuning Approach with Google Colab

```python
# Google Colab notebook for fine-tuning

# 1. Upload training_data.jsonl to Colab

# 2. Fine-tune using OpenAI API
from openai import OpenAI
client = OpenAI()

# Upload training file
training_file = client.files.create(
    file=open("training_data.jsonl", "rb"),
    purpose="fine-tune"
)

# Start fine-tuning job
job = client.fine_tuning.jobs.create(
    training_file=training_file.id,
    model="gpt-4o-mini-2024-07-18",
    hyperparameters={
        "n_epochs": 3,
        "batch_size": 4,
        "learning_rate_multiplier": 1.8,
    }
)

print(f"Fine-tuning job: {job.id}")

# 3. After completion, update config.py with the fine-tuned model:
# OPENAI_MODEL = "ft:gpt-4o-mini-2024-07-18:your-org::job-id"
```

---

## 8. Production Deployment

### Architecture Diagram

```
                    Internet
                       |
               +-------v-------+
               |  Load Balancer |
               |  (nginx/ALB)   |
               +---+-------+---+
                   |       |
          +--------v--+ +--v--------+
          | Frontend   | | Frontend  |
          | (Next.js)  | | (replica) |
          +--------+--+ +--+--------+
                   |        |
          +--------v--------v--------+
          |     .NET Backend          |
          |     (scaled replicas)     |
          +--------+---------+-------+
                   |         |
          +--------v--+  +--v-----------+
          | PostgreSQL |  | Redis Cache  |
          +--------+--+  +--+-----------+
                   |         |
          +--------v---------v--------+
          |   Python Agent Core       |
          |   (scaled by workload)    |
          +--------+--+--------------+
                   |  |
          +--------v--v---------+
          | Message Queue       |
          | (RabbitMQ / SQS)    |
          +-----------------------+
```

### Cloud Deployment Options

**AWS**:
- Frontend: S3 + CloudFront (static export) or ECS Fargate
- Backend: ECS Fargate or App Runner
- Agent Core: ECS Fargate with autoscaling
- Database: RDS PostgreSQL
- Cache: ElastiCache Redis
- Queue: SQS or Amazon MQ

**Azure**:
- Frontend: Azure Static Web Apps or App Service
- Backend: Azure App Service or Container Apps
- Agent Core: Azure Container Apps
- Database: Azure Database for PostgreSQL
- Cache: Azure Cache for Redis
- Queue: Azure Service Bus

**GCP**:
- Frontend: Cloud Run or Firebase Hosting
- Backend: Cloud Run
- Agent Core: Cloud Run with GPU (for local LLM)
- Database: Cloud SQL PostgreSQL
- Cache: Memorystore for Redis
- Queue: Cloud Pub/Sub

### Production Docker Compose

```yaml
version: "3.9"

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3002:3000"
    environment:
      - NEXT_PUBLIC_API_URL=https://api.taskpilot.example.com
      - NEXT_PUBLIC_AGENT_URL=https://agent.taskpilot.example.com
      - NODE_ENV=production
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 512M
          cpus: "0.5"

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "5002:5002"
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
      - ASPNETCORE_URLS=http://+:5002
      - AgentCore__BaseUrl=http://agent-core:8001
      - ConnectionStrings__DefaultConnection=Host=postgres;Database=taskpilot;Username=taskpilot;Password=${DB_PASSWORD}
      - Redis__ConnectionString=redis:6379
      - Auth__JwtSecret=${JWT_SECRET}
    depends_on:
      - postgres
      - redis
      - agent-core
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 1G
          cpus: "1.0"

  agent-core:
    build:
      context: ./agent-core
      dockerfile: Dockerfile
    ports:
      - "8001:8001"
    environment:
      - DOTNET_API_URL=http://backend:5002
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - AGENT_PORT=8001
      - MAX_ITERATIONS=15
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 2G
          cpus: "2.0"

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=taskpilot
      - POSTGRES_USER=taskpilot
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | No | OpenAI API key for LLM-powered planning |
| `DB_PASSWORD` | Yes (prod) | PostgreSQL password |
| `JWT_SECRET` | Yes (prod) | JWT signing secret |
| `REDIS_URL` | Recommended | Redis connection string |

---

## 9. Required Production Services

### 9.1 Authentication

Add JWT-based authentication to the .NET backend:

```csharp
// Program.cs - Add authentication middleware

using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

// In the builder section:
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.ASCII.GetBytes(builder.Configuration["Auth:JwtSecret"]!)
            ),
            ValidateIssuer = false,
            ValidateAudience = false,
            ClockSkew = TimeSpan.Zero
        };
    });

// In the middleware pipeline (after UseCors):
app.UseAuthentication();
app.UseAuthorization();

// On controllers that need protection:
[ApiController]
[Route("api/[controller]")]
[Authorize]  // Add this attribute
public class AgentController : ControllerBase
{
    // ...
}
```

### 9.2 Database Upgrade (SQLite to PostgreSQL)

```csharp
// TaskPilot.Api.csproj - Replace SQLite with Npgsql

<ItemGroup>
    <PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="8.0.2" />
</ItemGroup>

// Program.cs - Switch database provider
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection")
    )
);
```

### 9.3 Redis for Agent State

```python
# agent-core/config.py - Add Redis configuration
REDIS_URL: str = os.getenv("REDIS_URL", "")

# agent-core/state_store.py - Redis-backed state management
import redis.asyncio as redis
import json

class AgentStateStore:
    def __init__(self, redis_url: str):
        self._redis = redis.from_url(redis_url) if redis_url else None

    async def save_session(self, session_id: str, session_data: dict, ttl: int = 86400):
        if self._redis:
            await self._redis.setex(
                f"agent:session:{session_id}",
                ttl,
                json.dumps(session_data)
            )

    async def get_session(self, session_id: str) -> dict | None:
        if self._redis:
            data = await self._redis.get(f"agent:session:{session_id}")
            return json.loads(data) if data else None
        return None

    async def save_memory_snapshot(self, memories: dict):
        if self._redis:
            await self._redis.set("agent:memory:snapshot", json.dumps(memories))

    async def get_memory_snapshot(self) -> dict | None:
        if self._redis:
            data = await self._redis.get("agent:memory:snapshot")
            return json.loads(data) if data else None
        return None
```

### 9.4 Message Queue for Async Tasks

```python
# agent-core/queue_worker.py - RabbitMQ / Celery worker

from celery import Celery

celery_app = Celery(
    "taskpilot",
    broker="amqp://guest:guest@rabbitmq:5672//",
    backend="redis://redis:6379/0"
)

@celery_app.task(bind=True, max_retries=3)
def execute_agent_instruction(self, instruction: str, autonomy_level: str = "supervised"):
    """Execute an agent instruction asynchronously via the task queue."""
    import asyncio
    from agent_loop import AgentLoop

    loop = AgentLoop()
    session = asyncio.run(loop.run(instruction, autonomy_level))

    return {
        "session_id": session.id,
        "state": session.state.value,
        "total_steps": len(session.steps),
    }

# Usage from the .NET backend or from the FastAPI app:
# execute_agent_instruction.delay("Triage all open bugs")
```

### 9.5 LLM API Key Management

```python
# agent-core/config.py - Multi-provider key management

class Settings:
    # Primary LLM (OpenAI)
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    # Fallback LLM (Anthropic)
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    ANTHROPIC_MODEL: str = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")

    # Local LLM (Ollama)
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3.1")

    # LLM selection priority
    USE_MOCK_LLM: bool = not any([
        os.getenv("OPENAI_API_KEY"),
        os.getenv("ANTHROPIC_API_KEY"),
        os.getenv("OLLAMA_BASE_URL"),
    ])
```

### 9.6 Monitoring

```python
# agent-core/monitoring.py - Prometheus metrics

from prometheus_client import Counter, Histogram, Gauge, generate_latest
from fastapi import Response

# Metrics
agent_instructions_total = Counter(
    "agent_instructions_total",
    "Total instructions processed",
    ["status"]
)
agent_step_duration = Histogram(
    "agent_step_duration_seconds",
    "Time per agent step",
    ["phase"]
)
agent_tool_calls = Counter(
    "agent_tool_calls_total",
    "Total tool invocations",
    ["tool_name", "success"]
)
agent_memory_size = Gauge(
    "agent_memory_entries",
    "Number of memory entries",
    ["tier"]
)

# Add to main.py:
@app.get("/metrics")
async def metrics():
    return Response(
        content=generate_latest(),
        media_type="text/plain"
    )
```

### 9.7 Rate Limiting

```csharp
// Program.cs - Add rate limiting middleware

using System.Threading.RateLimiting;

builder.Services.AddRateLimiter(options =>
{
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(
        httpContext =>
            RateLimitPartition.GetFixedWindowLimiter(
                partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                factory: partition => new FixedWindowRateLimiterOptions
                {
                    AutoReplenishment = true,
                    PermitLimit = 100,
                    Window = TimeSpan.FromMinutes(1)
                }));

    options.OnRejected = async (context, token) =>
    {
        context.HttpContext.Response.StatusCode = 429;
        await context.HttpContext.Response.WriteAsync("Rate limit exceeded. Try again later.", token);
    };
});

// In the middleware pipeline:
app.UseRateLimiter();
```

---

## 10. Scaling Strategy

### Agent Concurrency

The current architecture allows one agent session at a time per agent-core instance. To support concurrent users:

1. **Horizontal scaling**: Deploy multiple agent-core replicas behind a load balancer.
2. **Session affinity**: Use Redis to store session state, allowing any replica to resume a session.
3. **Queue-based execution**: Route instructions through a message queue (RabbitMQ/SQS), with dedicated worker processes consuming tasks.

### Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Agent instruction latency | < 10s (3 steps) | ~3-5s |
| API response time (CRUD) | < 100ms | ~50ms |
| WebSocket event latency | < 50ms | ~10ms |
| Concurrent users | 100+ | 1 agent, unlimited API |
| Memory retrieval | < 20ms | ~5ms (in-memory) |
| Tool execution | < 2s per tool | ~100ms (mock) |

### Scaling Architecture

```
Load Balancer (nginx/ALB)
    |
    +-- Frontend (2-4 replicas, stateless)
    |
    +-- Backend API (3-5 replicas, stateless with DB)
    |       |
    |       +-- PostgreSQL (primary + read replica)
    |       +-- Redis (cluster)
    |
    +-- Agent Core Pool
            |
            +-- Agent Worker 1 (consuming from queue)
            +-- Agent Worker 2
            +-- Agent Worker N (auto-scaled by queue depth)
```

---

## 11. Monitoring and Observability

### Agent Action Logging

The agent already logs every action to the `AgentActions` database table via the `AgentOrchestratorService`. For enhanced observability:

```python
# agent-core/agent_loop.py - Structured logging

import logging
import json

logger = logging.getLogger("taskpilot.agent")

async def _execute_tool(self, tool_name: str, arguments: dict) -> Action:
    start_time = datetime.utcnow()
    tool = self.tools.get(tool_name)

    logger.info(
        "tool_execution_start",
        extra={
            "tool_name": tool_name,
            "arguments": json.dumps(arguments),
            "session_id": self.current_session.id if self.current_session else None,
        }
    )

    try:
        result = await tool.execute(arguments)
        duration = (datetime.utcnow() - start_time).total_seconds()

        logger.info(
            "tool_execution_complete",
            extra={
                "tool_name": tool_name,
                "success": result.get("success", False),
                "duration_seconds": duration,
            }
        )

        return Action(
            action_type=arguments.get("action", "execute"),
            tool_name=tool_name,
            arguments=arguments,
            result=result,
            success=result.get("success", False),
        )
    except Exception as exc:
        duration = (datetime.utcnow() - start_time).total_seconds()
        logger.error(
            "tool_execution_error",
            extra={
                "tool_name": tool_name,
                "error": str(exc),
                "duration_seconds": duration,
            }
        )
        raise
```

### Performance Metrics

Key metrics to track in production:

| Metric | Source | Alert Threshold |
|--------|--------|----------------|
| Agent instruction success rate | `agent_instructions_total{status="completed"}` | < 90% |
| Average step duration | `agent_step_duration_seconds` | > 5s |
| Tool failure rate | `agent_tool_calls_total{success="false"}` | > 10% |
| Memory growth rate | `agent_memory_entries{tier="long_term"}` | > 450 (nearing 500 cap) |
| Backend API p99 latency | Application Insights / Datadog | > 500ms |
| WebSocket connections | Connection count | > 1000 per instance |
| Database connection pool | EF Core diagnostics | Exhausted |

### Error Tracking

The agent core catches all exceptions at the top-level `run()` method and transitions to `ERROR` state:

```python
# From agent_loop.py:
except Exception as exc:
    self.state = AgentState.ERROR
    self.current_session.state = AgentState.ERROR
    self.current_session.error = str(exc)
    await self._emit_event("error", {
        "error": str(exc),
        "traceback": traceback.format_exc(),
    })
```

Integrate with Sentry for production error tracking:

```python
# agent-core/main.py - Add Sentry integration

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN", ""),
    integrations=[FastApiIntegration()],
    traces_sample_rate=0.1,
    environment=os.getenv("ENVIRONMENT", "development"),
)
```

---

## 12. Troubleshooting

### Common Issues

| Issue | Symptom | Solution |
|-------|---------|---------|
| Agent core not starting | `Connection refused on :8001` | Check Python virtual environment is activated and `requirements.txt` is installed |
| Backend cannot reach agent | `Could not reach agent core` in logs | Verify agent-core is running on port 8001. In Docker, ensure `AgentCore__BaseUrl` uses the service name (`http://agent-core:8001`) |
| Frontend shows "Unable to load" | Dashboard widgets show error states | Verify backend is running on port 5002. Check browser console for CORS errors |
| Agent returns empty results | Session completes with 0 steps | Check `MAX_ITERATIONS` is > 0. Ensure instruction matches at least one rule-based pattern (or provide an OpenAI key) |
| Database not seeded | Tasks page shows no tasks | Delete `taskpilot.db` and restart the backend. EF Core will recreate and seed |
| Mobile app cannot connect | Network request failed | Replace `localhost` with your machine's IP in `mobile/src/lib/api.ts` |
| WebSocket disconnects | Agent stream stops receiving events | The 30-second heartbeat keeps connections alive. Check network timeouts or proxy configurations |
| OpenAI errors | `openai.RateLimitError` | Check API key validity. Reduce `MAX_ITERATIONS`. Add retry logic with exponential backoff |
| Docker build fails | npm install errors in frontend | Clear Docker build cache: `docker compose build --no-cache` |
| Tasks not updating via drag-and-drop | Optimistic update reverts | Check backend logs for the PUT request. Verify task ID exists in the database |
| Memory viewer empty | No memories displayed | Memories are only created when the agent runs. Send an instruction first |
| Reports page empty | No reports listed | Generate a report using the "Generate Report" button or via the agent |
| Agent stuck in "thinking" | State never progresses | Check agent-core logs. The agent may be waiting for an LLM response (timeout). Restart with `USE_MOCK_LLM=true` to use rule-based mode |

### Debugging Commands

```bash
# Check all services are running
curl http://localhost:8001/          # Agent Core health
curl http://localhost:5002/          # Backend health
curl http://localhost:3002/          # Frontend (HTML)

# Check agent status
curl http://localhost:8001/agent/status | python3 -m json.tool

# List available tools
curl http://localhost:8001/agent/tools | python3 -m json.tool

# View agent memory
curl http://localhost:8001/agent/memory | python3 -m json.tool

# Run a test instruction
curl -X POST http://localhost:8001/agent/run-sync \
  -H "Content-Type: application/json" \
  -d '{"instruction": "List all tasks"}' | python3 -m json.tool

# Check task data
curl http://localhost:5002/api/tasks | python3 -m json.tool

# Check task stats
curl http://localhost:5002/api/tasks/stats | python3 -m json.tool

# View Docker logs
docker compose logs agent-core --tail 50
docker compose logs backend --tail 50
docker compose logs frontend --tail 50
```

### Log Locations

| Service | Log Source |
|---------|-----------|
| Agent Core | stdout (Uvicorn) -- `docker compose logs agent-core` |
| Backend | stdout (.NET logging) -- `docker compose logs backend` |
| Frontend | stdout (Next.js) -- `docker compose logs frontend` |
| Database | Backend logs (EF Core SQL logging at `Information` level) |
