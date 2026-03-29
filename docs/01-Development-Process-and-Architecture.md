# TaskPilot: Development Process and Architecture

## 1. Executive Summary

TaskPilot is an autonomous project management AI agent built on the ReAct (Reason-Act-Observe) paradigm. The system enables natural-language-driven project workflows -- triaging bugs, assigning tasks, generating reports, and monitoring project health -- all executed by an agent that reasons through multi-step plans, uses tools, and learns from its own observations.

### Codebase Metrics

| Metric | Value |
|--------|-------|
| Total Source Files | ~80 |
| Architectural Layers | 4 (Web Frontend, Mobile App, Backend API, Agent Core) |
| Languages | TypeScript, C#, Python |
| Agent Tools | 5 |
| Memory Tiers | 3 (Short-term, Working, Long-term) |
| Backend Controllers | 5 |
| Backend Services | 3 |
| Database Models | 6 |
| Frontend Pages | 5 |
| Frontend Components | 11 |
| Mobile Screens | 4 |
| Mobile Components | 3 |
| Seed Tasks | 8 |
| Docker Services | 4 |

The project demonstrates a production-grade architecture where a Python-based AI agent sits behind a .NET 8 API gateway, with a Next.js 14 web dashboard and a React Native/Expo mobile companion app as the two client surfaces.

---

## 2. Problem Statement

### The Repetitive Workflow Burden

Engineering project managers spend an estimated 60% or more of their working hours on repetitive, low-leverage workflows:

- **Bug triage**: Reading every new issue, classifying severity, assigning priority labels, routing to the right engineer.
- **Status reporting**: Gathering task data from multiple sources, computing metrics, formatting reports for stakeholders.
- **Task assignment**: Balancing workload across team members, matching expertise to requirements, tracking capacity.
- **Standup preparation**: Summarizing yesterday's progress, identifying blockers, planning today's focus.

These tasks share a common pattern: they require gathering context, applying judgment, taking a sequence of actions, and verifying the outcome. They are too complex for simple automation scripts (which lack reasoning), yet too repetitive for a human to perform efficiently every day.

### Why AI Agents with ReAct Loops

Traditional approaches fail because:

1. **Rule-based scripts** break when the situation deviates from hard-coded conditions.
2. **Simple LLM chat** generates text but cannot take actions in external systems.
3. **RPA bots** follow fixed click paths and cannot reason about novel scenarios.

An AI Agent with a ReAct loop solves this by combining:

- **Reasoning**: The agent thinks about what needs to happen before acting.
- **Tool use**: The agent has access to real tools (task management, code analysis, notifications) and invokes them programmatically.
- **Observation**: The agent reads the results of its actions and decides whether to continue, adjust, or stop.
- **Memory**: The agent remembers past interactions, learned patterns, and current context across iterations.

This architecture enables the agent to handle open-ended instructions like "triage all open bugs and assign priorities" by decomposing the goal into a plan, executing each step with the appropriate tool, and checking its own progress.

---

## 3. Solution Architecture

### Full System Diagram

```
 Users / Stakeholders
       |
       | Browser (port 3002)              Mobile Device (Expo)
       |                                        |
+------v--------------+          +--------------v-----------+
|  Next.js 14 Web      |          |  React Native / Expo     |
|  Frontend             |          |  Mobile App              |
|                       |          |                          |
|  Pages:               |          |  Screens:                |
|  - Dashboard          |          |  - TaskFeed              |
|  - Chat (ReAct view)  |          |  - AgentChat             |
|  - Tasks (Kanban)     |          |  - QuickActions          |
|  - Memory Viewer      |          |  - Notifications         |
|  - Reports            |          |                          |
+------+----------------+          +-----------+--------------+
       |  REST + SignalR                       |  REST
       |                                       |
+------v---------------------------------------v--------------+
|  .NET 8 Backend API  (port 5002)                            |
|                                                              |
|  Controllers:                  Services:                     |
|  - AgentController             - AgentOrchestratorService    |
|  - TasksController             - TaskManagementService       |
|  - ProjectsController          - ReportService               |
|  - MemoryController                                          |
|  - ReportsController           Hubs:                         |
|                                - AgentHub (SignalR)           |
|  Database: SQLite via EF Core                                |
|  Models: Project, TaskItem, AgentSession, AgentAction,       |
|          Memory, Report                                      |
+------+------------------------------------------------------+
       |  HTTP (sync / async)
       |
+------v------------------------------------------------------+
|  Python Agent Core  (port 8001)                              |
|                                                              |
|  FastAPI Application                                         |
|                                                              |
|  Core Modules:               Tools (5):                      |
|  - AgentLoop (ReAct engine)  - TaskManagerTool               |
|  - Planner (dual-mode)       - CodeAnalyzerTool              |
|  - MemoryManager (3-tier)    - ReportGeneratorTool           |
|  - Models (Pydantic)         - WebSearcherTool               |
|  - Config (env-based)        - NotificationTool              |
|                                                              |
|  Endpoints:                  WebSocket:                      |
|  - POST /agent/run           - WS /agent/stream              |
|  - POST /agent/run-sync        (real-time event streaming)   |
|  - GET  /agent/status                                        |
|  - POST /agent/stop                                          |
|  - GET  /agent/actions                                       |
|  - CRUD /agent/memory                                        |
|  - GET  /agent/tools                                         |
+--------------------------------------------------------------+
```

### Four-Layer Architecture

**Layer 1 -- Web Frontend (Next.js 14)**
The primary user interface. A server-side-rendered React application with Tailwind CSS styling, providing a dashboard, conversational chat with reasoning visualization, a Kanban task board, a 3-tier memory viewer, and report management.

**Layer 2 -- Mobile App (React Native / Expo)**
A companion application for on-the-go interaction. Four screens accessed via bottom-tab navigation: task feed, agent chat, notifications, and quick actions. Communicates with the same backend and agent core APIs.

**Layer 3 -- Backend API (.NET 8)**
The API gateway and persistence layer. Manages projects, tasks, agent sessions, memories, and reports in SQLite. Orchestrates communication between clients and the agent core. Provides real-time updates via SignalR.

**Layer 4 -- Agent Core (Python / FastAPI)**
The autonomous reasoning engine. Implements the 6-phase ReAct loop, manages a 3-tier memory system, orchestrates 5 specialized tools, and streams events to connected clients via WebSocket.

---

## 4. Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Web Frontend** | Next.js | 14.1.0 | React framework with SSR and app router |
| | React | 18.2.0 | UI component library |
| | TypeScript | 5.3.3 | Type-safe JavaScript |
| | Tailwind CSS | 3.4.1 | Utility-first CSS framework |
| | @microsoft/signalr | 8.0.0 | Real-time SignalR client |
| | lucide-react | 0.323.0 | Icon library |
| **Mobile App** | React Native | 0.73.4 | Cross-platform mobile framework |
| | Expo | 50.0.6 | React Native toolchain |
| | @react-navigation | 6.x | Navigation (bottom tabs) |
| | react-native-safe-area-context | 4.8.2 | Safe area handling |
| **Backend API** | .NET | 8.0 | Web API framework |
| | Entity Framework Core | 8.0.2 | ORM for SQLite |
| | SQLite | via EF Core | Embedded relational database |
| | SignalR | 8.0.2 | Real-time WebSocket hub |
| | Swagger / OpenAPI | built-in | API documentation |
| **Agent Core** | Python | 3.11 | Agent runtime |
| | FastAPI | 0.109.2 | Async web framework |
| | Uvicorn | 0.27.1 | ASGI server |
| | Pydantic | 2.6.1 | Data validation and models |
| | httpx | 0.26.0 | Async HTTP client |
| | OpenAI SDK | 1.12.0 | LLM integration (optional) |
| | NumPy | 1.26.4 | Numerical computation for embeddings |
| | scikit-learn | 1.4.0 | ML utilities |
| | tiktoken | 0.6.0 | Token counting |
| **Infrastructure** | Docker Compose | 3.9 | Multi-service orchestration |

---

## 5. System Design

### Service Communication

The system uses a layered communication model:

```
Clients (Browser / Mobile)
    |
    | REST API calls (HTTP/JSON)
    | SignalR WebSocket (real-time events)
    |
.NET Backend (gateway + persistence)
    |
    | HTTP calls to Agent Core
    |   - POST /agent/run-sync  (synchronous execution)
    |   - GET  /agent/status    (health polling)
    |   - POST /agent/stop      (cancellation)
    |
Python Agent Core (autonomous reasoning)
    |
    | WebSocket stream (agent events)
    |   Clients can also connect directly to WS /agent/stream
```

### WebSocket Streaming

The agent core exposes a WebSocket endpoint at `WS /agent/stream` that emits real-time events as the agent processes an instruction. Each event has the structure:

```json
{
  "event_type": "thought | plan | action | observation | state_change | complete | error | heartbeat",
  "data": { ... },
  "timestamp": "2026-03-14T10:30:00Z"
}
```

The WebSocket implementation uses an asyncio Queue-per-subscriber pattern. When a client connects, a new `asyncio.Queue` is created and added to `_stream_listeners`. The agent loop pushes `StreamEvent` objects into every queue via `_emit_event()`. A 30-second heartbeat keeps connections alive during idle periods.

### SignalR Hub

The .NET backend provides a `AgentHub` at `/hubs/agent` for broadcasting task-level events to web clients:

- `AgentStateChanged` -- emitted when the agent starts or finishes a session
- `TaskCreated`, `TaskUpdated`, `TaskAssigned`, `TaskDeleted` -- emitted by TasksController after mutations
- `Connected` -- sent to the caller on connection
- `SubscribeToSession` / `UnsubscribeFromSession` -- group-based session tracking

This dual-stream architecture (Python WebSocket for agent reasoning events, .NET SignalR for CRUD events) provides complete real-time coverage.

---

## 6. AI Agent Core Development

This is the heart of TaskPilot. The agent core is a Python application built with FastAPI that implements an autonomous reasoning engine.

### 6.1 ReAct Loop Implementation

The ReAct loop is implemented in `agent_loop.py` inside the `AgentLoop` class. Each instruction triggers a multi-iteration cycle with up to `MAX_ITERATIONS` (default: 10) passes. Every iteration executes six distinct phases:

```
Phase 1: REASON     --> Planner.reason()        --> Thought
Phase 2: PLAN       --> Planner.plan()          --> Plan with ToolCalls
Phase 3: ACT        --> AgentLoop._execute_tool()--> Action results
Phase 4: OBSERVE    --> AgentLoop._create_observation() --> Observation
Phase 5: REMEMBER   --> MemoryManager.store_interaction()
Phase 6: CHECK      --> Planner.check_completion() --> bool (is_final)
```

**Phase 1 -- REASON**: The planner analyzes the instruction, the current memory context (from `memory.get_context_window()`), all previous observations, and the current iteration number. It produces a `Thought` object containing a content summary and detailed reasoning.

**Phase 2 -- PLAN**: Based on the thought, the planner generates a `Plan` that includes a goal description, a list of human-readable steps, and a list of `ToolCall` objects specifying which tools to invoke and with what arguments.

**Phase 3 -- ACT**: The agent loop iterates over every `ToolCall` in the plan, resolves the tool by name from the registered tool dictionary, and calls `tool.execute(arguments)`. Each execution returns an `Action` object with the result, success/failure status, and any error message.

**Phase 4 -- OBSERVE**: The agent consolidates all action results into a single `Observation`. It parses tool-specific results (task counts, report metrics, code issues) and constructs a human-readable summary. It also detects completion signals ("completed successfully", "triage complete", etc.).

**Phase 5 -- REMEMBER**: The full interaction cycle (thought, action, observation) is stored across memory tiers via `memory.store_interaction()`. Significant interactions (determined by keyword heuristics) are automatically promoted to long-term memory.

**Phase 6 -- CHECK**: The planner evaluates whether the goal has been achieved by checking:
1. Whether `MAX_ITERATIONS` has been reached (hard stop).
2. Whether the last observation contains completion signals (e.g., "completed successfully", "report generated").
3. Optionally, an LLM-based completion check (when OpenAI is configured and at least 2 steps have been taken).

If `is_final` is `True`, the loop terminates and the session state transitions to `COMPLETED`.

### 6.2 Planner -- Dual-Mode Architecture

The `Planner` class in `planner.py` operates in two modes:

**Mode 1: LLM-Based (OpenAI)**
When `OPENAI_API_KEY` is set, the planner uses GPT-4o-mini (configurable via `OPENAI_MODEL`) for reasoning, planning, and completion checking.

- `_llm_reason()`: Sends a prompt with the instruction, memory context, and recent observations. Asks the LLM to think step-by-step. Temperature: 0.3, max tokens: 500.
- `_llm_plan()`: Sends a prompt listing all 5 available tools and their capabilities. Asks the LLM to respond with a JSON plan containing `goal`, `steps`, and `tool_calls`. Temperature: 0.2, max tokens: 600. Includes a fallback to rule-based planning if JSON parsing fails.
- `_llm_check_completion()`: Sends recent observations and asks the LLM a simple yes/no question about goal achievement. Temperature: 0.1, max tokens: 10.

**Mode 2: Rule-Based (Mock LLM)**
When no OpenAI key is provided, the planner uses keyword-matching heuristics. The instruction is lowercased and matched against keyword patterns:

```python
# Instruction parsing heuristics (from planner.py):
"triage" or "bug"     --> Bug triage workflow
"report"              --> Report generation (daily/weekly/status)
"assign"              --> Task assignment workflow
"status" or "standup" --> Standup summary
"create" and "task"   --> Task creation
"analyze" or "code"   --> Code analysis
(default)             --> List tasks and gather data
```

Each keyword match generates a specific goal, plan steps, and tool calls. For example, the "triage" keyword triggers:
1. `task_manager.list` (filter: open tasks)
2. `task_manager.update_batch` (set priorities)
3. `notification.send` (announce triage results)

The rule-based planner also handles iteration > 0 by adjusting reasoning to incorporate previous observations.

### 6.3 Three-Tier Memory System

The `MemoryManager` class in `memory_manager.py` implements a cognitive-architecture-inspired memory system:

**Tier 1 -- Short-Term Memory (Rolling Window)**
- Capacity: 20 entries (configurable via `MEMORY_CAPACITY_SHORT_TERM`)
- Purpose: Current conversation context
- Behavior: FIFO eviction. When capacity is exceeded, the oldest entry is evaluated for significance. Significant entries are promoted to long-term memory; the rest are discarded.
- Retrieval weight: 1.5x multiplier (highest recency bias)

**Tier 2 -- Working Memory (Active Task State)**
- Capacity: Unbounded during a session
- Purpose: Stores action-result pairs from the current task
- Behavior: Populated by `store_interaction()` with `"Action: X -> Result: Y"` formatted entries
- Retrieval weight: 1.2x multiplier
- Cleared when a task completes

**Tier 3 -- Long-Term Memory (Persistent Patterns)**
- Capacity: 500 entries (configurable via `MEMORY_CAPACITY_LONG_TERM`)
- Purpose: Learned patterns, completed session summaries, promoted short-term memories
- Behavior: Each entry is stored with a 128-dimensional embedding. When capacity is exceeded, the entry with the lowest relevance score is evicted.
- Retrieval: Uses cosine similarity between query embedding and stored embeddings

**Embedding System**: The current implementation uses a deterministic hash-based embedding for consistency without requiring an external API. For each word in the text, character-level hashes are used to populate a 128-dimensional vector, weighted by inverse position (earlier words carry more weight). The vector is L2-normalized.

**Significance Detection**: An interaction is deemed "significant" and promoted to long-term memory when it contains 2 or more keywords from a predefined list (`"important"`, `"learned"`, `"critical"`, `"error"`, `"success"`, `"completed"`, etc.) or when the combined text exceeds 300 characters.

**Retrieval**: The `retrieve_relevant()` method searches across all three tiers with tier-specific scoring weights:

```python
# From memory_manager.py:
for entry in self.short_term[-10:]:
    score = self._text_similarity(query, entry.content) * 1.5  # recency bias

for entry in self.working:
    score = self._text_similarity(query, entry.content) * 1.2  # task relevance

for entry in self.long_term:
    if entry.embedding:
        score = self._cosine_similarity(query_embedding, entry.embedding)
    else:
        score = self._text_similarity(query, entry.content)
```

### 6.4 The Five Tools

Every tool extends `BaseTool`, which defines:
- `name` (property): Unique identifier used by the planner
- `description` (property): Human-readable description for LLM context
- `parameters_schema` (property): JSON Schema for argument validation
- `execute(arguments)` (async method): Performs the action and returns `{"success": bool, "data": {...}}` or `{"success": bool, "error": "..."}`

#### Tool 1: TaskManagerTool (`task_manager`)

**Purpose**: CRUD operations on project tasks, including batch updates and assignments.

**Actions**: `list`, `create`, `update`, `assign`, `delete`, `update_batch`, `assign_batch`

**Communication**: Tries the .NET backend first via httpx (`{DOTNET_API_URL}/api/tasks`). On failure (backend unreachable), falls back to an in-memory mock store with 8 pre-seeded tasks.

**Input/Output Example**:
```python
# Input:
{"action": "list", "filter": {"status": "open"}}

# Output:
{
  "success": True,
  "data": {
    "tasks": [
      {"id": "task-001", "title": "Fix login crash on iOS", "status": "open", "priority": "high", ...},
      ...
    ],
    "count": 3
  }
}
```

The `_apply_filter()` method supports filtering by any task field, including filtering by `None` (for unassigned tasks). Batch operations (`update_batch`, `assign_batch`) match tasks by title (case-insensitive) and apply updates in-place.

#### Tool 2: CodeAnalyzerTool (`code_analyzer`)

**Purpose**: Analyze code structure, find issues, compute quality metrics, and provide recommendations.

**Actions**: `analyze` (full structure analysis), `find_issues` (issue detection), `metrics` (quality score), `review` (recommendations)

**Scoping**: The `scope` parameter (`full`, `frontend`, `backend`, `agent`) filters results to specific parts of the codebase.

**Input/Output Example**:
```python
# Input:
{"action": "find_issues", "scope": "full"}

# Output:
{
  "success": True,
  "data": {
    "issues": [
      {
        "severity": "high",
        "type": "performance",
        "location": "frontend/src/components/tasks/KanbanBoard.tsx",
        "line": 45,
        "message": "Large list rendering without virtualization...",
        "suggestion": "Import FixedSizeList from react-window..."
      },
      ...
    ],
    "total": 5,
    "by_severity": {"high": 1, "medium": 2, "low": 2}
  }
}
```

#### Tool 3: ReportGeneratorTool (`report_generator`)

**Purpose**: Generate formatted project reports from task data.

**Actions**: `generate`, `list`

**Report Types**: `daily`, `weekly`, `standup`, `sprint`, `status`

Each report type produces a different Markdown structure with relevant metrics. Reports include task counts, completion rates, priority breakdowns, team workload distribution, and recommendations.

**Input/Output Example**:
```python
# Input:
{"action": "generate", "report_type": "weekly"}

# Output:
{
  "success": True,
  "data": {
    "report_type": "weekly",
    "generated_at": "2026-03-14T10:30:00Z",
    "content": "# Weekly Status Report - Week of 2026-03-14\n\n## Executive Summary\n...",
    "metrics": {
      "total_tasks": 8,
      "completed": 1,
      "in_progress": 2,
      "open": 5,
      "blocked": 0,
      "completion_rate": 12.5
    },
    "message": "Report generated successfully. Triage complete."
  }
}
```

#### Tool 4: WebSearcherTool (`web_searcher`)

**Purpose**: Search the web for information relevant to project decisions.

**Actions**: `search` (web search), `lookup` (knowledge base query)

The search action uses contextual matching to return relevant mock results based on query keywords (bug/fix, report/status, assign/workload). The lookup action queries an internal knowledge base covering bug priorities, agile planning, code review practices, and CI/CD.

**Input/Output Example**:
```python
# Input:
{"action": "search", "query": "bug triage best practices", "max_results": 3}

# Output:
{
  "success": True,
  "data": {
    "query": "bug triage best practices",
    "results": [
      {"title": "Best Practices for Bug Triage in Agile Teams", "url": "...", "snippet": "..."},
      ...
    ],
    "total_results": 3,
    "search_time_ms": 245,
    "source": "mock"
  }
}
```

#### Tool 5: NotificationTool (`notification`)

**Purpose**: Send alerts and messages to team members or channels.

**Actions**: `send`, `send_batch`, `list_sent`, `clear`

Notifications support urgency levels (`low`, `normal`, `high`, `critical`) and are stored in an in-memory log. Each notification records the channel, recipients, urgency, delivery status, and timestamp.

**Input/Output Example**:
```python
# Input:
{"action": "send", "message": "Bug triage completed.", "channel": "project-updates", "urgency": "normal"}

# Output:
{
  "success": True,
  "data": {
    "notification": {"id": "uuid...", "message": "...", "channel": "project-updates", ...},
    "message": "Notification sent to #project-updates"
  }
}
```

### 6.5 Agent State Machine

The agent transitions through the following states during execution:

```
                                  +----------+
            +-------------------->| STOPPED  |
            |                     +----------+
            | (user calls /stop)
            |
 +------+   |   +-----------+    +-----------+    +--------+    +-----------+
 | IDLE |------>| THINKING  |--->| PLANNING  |--->| ACTING |--->| OBSERVING |
 +------+       +-----------+    +-----------+    +--------+    +-----------+
                     ^                                               |
                     |    (if not is_final)                          |
                     +-----------------------------------------------+
                     |
                     |    (if is_final or max iterations)
                     v
              +-----------+
              | COMPLETED |
              +-----------+

              +-------+
              | ERROR |  <-- (any unhandled exception)
              +-------+
```

States are defined in `models.py` as `AgentState(str, Enum)` with values: `idle`, `thinking`, `planning`, `acting`, `observing`, `completed`, `error`, `stopped`.

Every state transition emits a `state_change` event through the WebSocket stream, enabling connected clients to render real-time agent state indicators (animated dots, color changes, progress badges).

### 6.6 WebSocket Event Streaming

The agent emits the following event types during execution:

| Event Type | When Emitted | Key Data Fields |
|-----------|-------------|----------------|
| `state_change` | Every phase transition | `state`, `iteration` |
| `thought` | After reasoning completes | `id`, `content`, `reasoning`, `iteration` |
| `plan` | After plan generation | `id`, `goal`, `steps`, `tool_calls`, `iteration` |
| `action` | After each tool execution | `id`, `tool_name`, `arguments`, `success`, `result_preview`, `error` |
| `observation` | After observation synthesis | `id`, `content`, `source`, `iteration` |
| `complete` | Session finished successfully | `session_id`, `total_steps`, `total_actions` |
| `error` | Unhandled exception | `error`, `traceback` |
| `heartbeat` | Every 30s during idle WebSocket | (empty) |

The `_serialize_event_data()` function in `main.py` recursively converts all data values to JSON-serializable types (datetime to ISO string, nested dicts/lists, fallback to `str()`).

---

## 7. Backend Development (.NET 8)

### 7.1 Controllers (5)

**AgentController** (`/api/agent`):
- `POST /run` -- Accepts an `AgentRunDto` with `Instruction`, `ProjectId`, and `AutonomyLevel`. Delegates to `AgentOrchestratorService` which calls the Python agent core synchronously, persists the session and actions to SQLite, and broadcasts state changes via SignalR.
- `GET /status` -- Proxies to the agent core's `/agent/status` endpoint. Falls back to the last known session from the database if the agent core is unreachable.
- `POST /stop` -- Sends a stop request to the agent core.
- `GET /sessions` -- Returns session history with pagination.
- `GET /actions` -- Returns action history with pagination.

**TasksController** (`/api/tasks`):
- Full CRUD with query filters for `projectId`, `status`, `priority`, `assignee`.
- `PUT /{id}/status` -- Dedicated status update endpoint.
- `PUT /{id}/assign` -- Dedicated assignment endpoint.
- Every mutation broadcasts via SignalR (`TaskCreated`, `TaskUpdated`, `TaskAssigned`, `TaskDeleted`).

**ProjectsController** (`/api/projects`):
- Standard CRUD. Projects include navigation properties to their Tasks and Reports collections (loaded via `.Include()`).

**MemoryController** (`/api/memory`):
- Dual-source: Tries the agent core first (live in-memory state), falls back to SQLite persistence.
- Full CRUD for memory entries with `memoryType` filtering.

**ReportsController** (`/api/reports`):
- `GET /` -- List reports with optional `projectId` and `reportType` filters.
- `POST /generate` -- Generates a new report by computing live task statistics and saving the rendered Markdown content to the database.
- `DELETE /{id}` -- Remove a report.

### 7.2 Services (3)

**AgentOrchestratorService**:
The most critical backend service. It:
1. Creates an `AgentSession` record in the database.
2. Broadcasts `AgentStateChanged` via SignalR.
3. Makes a synchronous HTTP POST to `{AgentCore:BaseUrl}/agent/run-sync`.
4. Parses the JSON response, extracting steps and actions.
5. Persists each `AgentAction` to the database.
6. Handles failures gracefully: if the agent core is unreachable, it records a fallback response rather than failing.

**TaskManagementService**:
Standard CRUD service with query filtering (LINQ-based), logging, and `GetTaskStatsAsync()` which computes aggregated metrics (by status, by priority, completion rate, overdue count).

**ReportService**:
Generates formatted Markdown reports from live task data. Supports 5 report types (`standup`, `daily`, `weekly`, `sprint`, `status`), each with a dedicated builder method. Reports are persisted to the database with metrics stored as JSON.

### 7.3 Models (6)

| Model | Key Fields | Relationships |
|-------|-----------|---------------|
| `Project` | Id, Name, Description, Status, Owner, CreatedAt | Has many Tasks, Reports |
| `TaskItem` | Id, Title, Description, Status, Priority, Assignee, ProjectId, DueDate, Tags | Belongs to Project |
| `AgentSession` | Id, Instruction, State, AutonomyLevel, TotalSteps, TotalActions, StepsJson | Has many AgentActions |
| `AgentAction` | Id, SessionId, ActionType, ToolName, ArgumentsJson, ResultJson, Success, Error | Belongs to AgentSession |
| `Memory` | Id, Content, MemoryType, MetadataJson, RelevanceScore | Standalone |
| `Report` | Id, Title, ReportType, Content, MetricsJson, ProjectId, GeneratedBy | Belongs to Project |

### 7.4 SignalR Hub

`AgentHub` provides:
- Connection/disconnection logging
- `SubscribeToSession(sessionId)` -- Adds the caller to a SignalR group `session-{sessionId}`
- `UnsubscribeFromSession(sessionId)` -- Removes from the group
- `SendMessage(message)` -- Broadcasts a user message to all connected clients

### 7.5 Seed Data

The `AppDbContext.OnModelCreating()` method seeds:
- **1 Project**: "TaskPilot Demo Project" (`proj-001`)
- **8 Tasks** across all statuses and priorities:

| Task | Status | Priority | Assignee |
|------|--------|----------|----------|
| Fix login crash on iOS | open | high | (none) |
| Update user profile UI | in_progress | medium | Alice |
| Database connection timeout | open | critical | (none) |
| Write API documentation | todo | low | Bob |
| Implement push notifications | todo | medium | (none) |
| Memory leak in dashboard | open | high | (none) |
| Set up CI/CD pipeline | done | high | Charlie |
| Add dark mode support | in_progress | low | Diana |

---

## 8. Web Frontend Development (Next.js)

### 8.1 Dashboard (page.tsx -- root)

The main page combines three dashboard widgets in a 3-column grid:

- **Quick Instruction Bar**: Text input + 4 preset action buttons ("Triage Bugs", "Weekly Report", "Assign Tasks", "Code Analysis"). Calls `runAgent()` directly and shows a success/error banner.
- **AgentStatus**: Polls `/agent/status` every 3 seconds. Displays the current state with animated color indicators, total actions, uptime, memory counts (short-term/working/long-term), and available tools.
- **ProjectHealth**: Polls `/api/tasks/stats` every 10 seconds. Renders a circular SVG health score gauge (0-100) computed from completion rate (40% weight), critical task count (30% weight), and unassigned ratio (30% weight). Shows status breakdown and metrics cards.
- **ActionTimeline**: Polls `/agent/actions` every 5 seconds. Renders a scrollable list of recent agent actions with tool-specific icons, success/failure badges, argument previews, and timestamps.

### 8.2 Chat (chat/page.tsx)

A conversational interface for interacting with the agent:

- **AgentChat**: Full-screen chat component with user/agent message bubbles, quick action buttons, loading animation, and auto-scroll.
- **ReasoningStep**: For each `AgentStep` in the session response, renders a color-coded 4-panel visualization:
  - Amber: Thinking (reasoning text)
  - Violet: Planning (goal + numbered steps)
  - Blue: Acting (tool name, arguments JSON, success/failure)
  - Emerald: Observing (observation content, "Goal Achieved" badge)
- **ActionCard**: Expandable card showing tool name, action type, success status, and collapsible arguments JSON.

### 8.3 Tasks (tasks/page.tsx)

A Kanban board with 4 columns: To Do, In Progress, Done, Blocked.

- **KanbanBoard**: Fetches tasks from `/api/tasks`, groups by status, implements HTML5 drag-and-drop with optimistic updates. Includes an "Add Task" form with title input and priority selector.
- **TaskCard**: Draggable card showing priority badge (color-coded), title, description preview, tag chips, assignee avatar, due date, and overdue indicator. Delete button with confirmation.

### 8.4 Memory (memory/page.tsx)

- **MemoryViewer**: Tabbed interface for the 3 memory tiers. Each tier has a description, icon, and color scheme. Supports adding new memories (with type selection), inline editing, and deletion. Shows creation timestamp and relevance score. Tries the agent core first for live memory state, falls back to the backend database.

### 8.5 Reports (reports/page.tsx)

- **ReportViewer**: Split-pane layout. Left column lists generated reports with type badges and timestamps. Right column renders the selected report's Markdown content via a custom `renderMarkdown()` function that converts headers, tables, lists, bold text, and paragraphs to styled HTML. Includes a "Generate Report" button with type selector (status/daily/weekly/standup/sprint).

### 8.6 Layout

- **Sidebar**: Fixed 256px-wide navigation with 5 links (Dashboard, Chat, Tasks, Memory, Reports). Active link highlighting. App branding at top, version footer at bottom.
- **Header**: 64px height. Displays page title, real-time agent state indicator (polling every 5s), total action count, and user avatar placeholder.

---

## 9. Mobile App Development (React Native / Expo)

### 9.1 Navigation

Bottom tab navigator (`createBottomTabNavigator`) with 4 tabs:

| Tab | Screen | Header Title |
|-----|--------|-------------|
| Tasks | TaskFeedScreen | "Task Feed" |
| Chat | AgentChatScreen | "Agent Chat" |
| Notifications | NotificationsScreen | "Notifications" |
| Actions | QuickActionsScreen | "Quick Actions" |

Styling: Primary color `#4F46E5`, white backgrounds, `#F3F4F6` borders.

### 9.2 Screens

**TaskFeed**: Horizontal filter tabs (All, To Do, In Progress, Done, Blocked), task count display, `FlatList` with pull-to-refresh. Tap a task to move it to the next status (todo -> in_progress -> done) via `Alert.alert()` confirmation dialog.

**AgentChat**: `KeyboardAvoidingView` with `FlatList` of chat bubbles, text input with send button, quick suggestion buttons (4 preset instructions). Calls `runAgent()` on the agent core directly and formats the response.

**QuickActions**: `ScrollView` with 8 pre-configured action buttons, each with a label, description, color accent, and loading state. Actions include: Triage Bugs, Generate Weekly Report, Daily Standup, Assign Tasks, Code Analysis, Status Report, Check Blocked Tasks, Sprint Review.

**Notifications**: `FlatList` with mock notification data (6 entries) demonstrating info/success/warning/error types, read/unread states, relative timestamps, and color-coded type icons.

### 9.3 Components

- **TaskItem**: Card with priority badge, status badge (dot + label), title, description, assignee avatar, due date, and overdue highlighting.
- **ChatBubble**: User messages (indigo, right-aligned) and agent messages (gray, left-aligned) with rounded corners and timestamps.
- **ActionButton**: Card with color-coded left border, label, description, loading spinner, and play icon.

---

## 10. Database Schema

SQLite database (`taskpilot.db`) managed by Entity Framework Core:

```sql
CREATE TABLE Projects (
    Id          TEXT PRIMARY KEY,
    Name        TEXT NOT NULL,
    Description TEXT,
    Status      TEXT DEFAULT 'active',    -- active, paused, completed, archived
    Owner       TEXT,
    CreatedAt   TEXT,
    UpdatedAt   TEXT
);

CREATE TABLE Tasks (
    Id          TEXT PRIMARY KEY,
    Title       TEXT NOT NULL,             -- max 500 chars
    Description TEXT,
    Status      TEXT DEFAULT 'todo',       -- todo, open, in_progress, done, blocked (max 50)
    Priority    TEXT DEFAULT 'medium',     -- critical, high, medium, low (max 50)
    Assignee    TEXT NULL,
    ProjectId   TEXT NOT NULL,
    CreatedAt   TEXT,
    UpdatedAt   TEXT,
    DueDate     TEXT NULL,
    Tags        TEXT DEFAULT '[]',         -- JSON array as string
    FOREIGN KEY (ProjectId) REFERENCES Projects(Id) ON DELETE CASCADE
);

CREATE TABLE AgentSessions (
    Id            TEXT PRIMARY KEY,
    Instruction   TEXT NOT NULL,
    State         TEXT DEFAULT 'idle',     -- idle, thinking, planning, acting, observing, completed, error, stopped
    AutonomyLevel TEXT DEFAULT 'supervised',
    TotalSteps    INTEGER DEFAULT 0,
    TotalActions  INTEGER DEFAULT 0,
    StartedAt     TEXT,
    CompletedAt   TEXT NULL,
    Error         TEXT NULL,
    StepsJson     TEXT DEFAULT '[]'        -- Full session data as JSON
);

CREATE TABLE AgentActions (
    Id            TEXT PRIMARY KEY,
    SessionId     TEXT NOT NULL,
    ActionType    TEXT,
    ToolName      TEXT,
    ArgumentsJson TEXT DEFAULT '{}',
    ResultJson    TEXT NULL,
    Success       INTEGER DEFAULT 1,
    Error         TEXT NULL,
    Timestamp     TEXT,
    FOREIGN KEY (SessionId) REFERENCES AgentSessions(Id) ON DELETE CASCADE
);

CREATE TABLE Memories (
    Id             TEXT PRIMARY KEY,
    Content        TEXT NOT NULL,
    MemoryType     TEXT DEFAULT 'long_term',  -- short_term, working, long_term (max 50)
    MetadataJson   TEXT DEFAULT '{}',
    CreatedAt      TEXT,
    RelevanceScore REAL DEFAULT 0.0
);

CREATE TABLE Reports (
    Id           TEXT PRIMARY KEY,
    Title        TEXT NOT NULL,
    ReportType   TEXT DEFAULT 'status',    -- daily, weekly, standup, sprint, status (max 50)
    Content      TEXT,
    MetricsJson  TEXT DEFAULT '{}',
    ProjectId    TEXT NOT NULL,
    GeneratedAt  TEXT,
    GeneratedBy  TEXT DEFAULT 'agent',
    FOREIGN KEY (ProjectId) REFERENCES Projects(Id) ON DELETE CASCADE
);
```

### Relationships

```
Project (1) ----< (many) TaskItem       [FK: ProjectId, CASCADE delete]
Project (1) ----< (many) Report         [FK: ProjectId, CASCADE delete]
AgentSession (1) ----< (many) AgentAction [FK: SessionId, CASCADE delete]
Memory                                   [standalone, no foreign keys]
```

---

## 11. Infrastructure

### Docker Compose (4 Services)

```yaml
services:
  frontend:       # Next.js 14 -- port 3002
  backend:        # .NET 8 API -- port 5002
  agent-core:     # Python FastAPI -- port 8001
  mobile:         # Expo (web) -- port 19006
```

**Service Dependencies**:
```
frontend ---- depends_on ----> backend, agent-core
backend  ---- depends_on ----> agent-core
```

**Volumes**: `backend-data` for SQLite database persistence across container restarts.

**Environment Variables**:

| Variable | Service | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_API_URL` | frontend | .NET backend URL |
| `NEXT_PUBLIC_AGENT_URL` | frontend | Python agent URL |
| `ASPNETCORE_URLS` | backend | Listener binding |
| `AgentCore__BaseUrl` | backend | Agent core URL (internal Docker network) |
| `ConnectionStrings__DefaultConnection` | backend | SQLite path |
| `DOTNET_API_URL` | agent-core | .NET backend URL (internal Docker network) |
| `OPENAI_API_KEY` | agent-core | Optional LLM key |
| `AGENT_PORT` | agent-core | FastAPI port |

### Docker Images

| Service | Base Image | Exposed Port |
|---------|-----------|-------------|
| frontend | `node:18-alpine` | 3000 (mapped to 3002) |
| backend | `mcr.microsoft.com/dotnet/aspnet:8.0` (multi-stage) | 5002 |
| agent-core | `python:3.11-slim` | 8001 |
| mobile | `node:18-alpine` | 19006 |

---

## 12. The Agent Intelligence

### How the Agent Reasons

The agent's intelligence emerges from the interaction between its planner and its memory system. When an instruction arrives:

1. The instruction is stored in short-term memory with metadata `{"type": "instruction"}`.
2. The planner builds a context window from the 5 most recent working memory entries and the 8 most recent short-term memory entries.
3. In rule-based mode, the planner matches instruction keywords to generate domain-specific reasoning. In LLM mode, the planner sends the full context to GPT-4o-mini for open-ended reasoning.

### How the Agent Plans

Plan generation follows a two-stage process:

**Stage 1 -- Goal Decomposition**: The instruction is broken into a goal statement and ordered sub-steps. For example, "Triage all open bugs" becomes:
- Goal: "Triage open bugs and assign priorities"
- Steps: List all open tasks -> Analyze severity -> Assign priorities -> Update tasks -> Notify team

**Stage 2 -- Tool Selection**: Each sub-step is mapped to specific tool calls with concrete arguments. The rule-based planner uses hard-coded mappings; the LLM planner generates these dynamically.

### How the Agent Makes Decisions

**Completion Detection** is the key decision point. The agent uses a cascading strategy:

1. **Hard limit**: If `steps_taken >= MAX_ITERATIONS`, stop regardless.
2. **Signal matching**: Check the last observation for completion keywords (`"completed successfully"`, `"triage complete"`, `"report generated"`, etc.).
3. **LLM evaluation** (when available): After at least 2 steps, ask the LLM "Has this goal been achieved?" with the observation history.

**Instruction Parsing Heuristics** (from `_rule_based_plan()`):

The planner extracts structured data from natural language. For task creation, `_extract_task_title()` uses regex patterns:
```python
patterns = [
    r'create (?:a )?task[:\s]+["\']?(.+?)["\']?\s*$',
    r'add (?:a )?task[:\s]+["\']?(.+?)["\']?\s*$',
    r'new task[:\s]+["\']?(.+?)["\']?\s*$',
]
```

If no pattern matches, it falls back to word-position heuristics, skipping common keywords and extracting the remainder as the title.

### Observation Synthesis

The `_create_observation()` method in `agent_loop.py` converts raw tool results into structured natural-language observations. It handles each tool differently:

- **task_manager**: Counts listed tasks, summarizes titles with status/priority, reports created/updated/assigned tasks.
- **report_generator**: Extracts report type, key metrics (total tasks, completion rate), and the "Triage complete" message.
- **code_analyzer**: Summarizes issue counts by severity, or reports the quality score.
- **web_searcher**: Reports the number of search results found.
- **notification**: Confirms delivery with the channel name.

Failed actions are prefixed with `"FAILED:"` and the error message. If all actions succeeded and the observation contains "complete" or "generated", a goal-progress marker is appended: `"Goal progress: completed successfully."` -- this triggers the completion detector.

### Session Lifecycle

```
1. User sends instruction via POST /agent/run (async) or /agent/run-sync (blocking)
2. AgentSession created with state=THINKING
3. Instruction stored in short-term memory
4. Loop begins (max 10 iterations):
     a. Reason about instruction + context + observations
     b. Generate plan with tool calls
     c. Execute each tool call sequentially
     d. Synthesize observation from results
     e. Store interaction in memory (short-term + working + optionally long-term)
     f. Check if goal is complete
     g. If complete, break; else continue
5. Session state transitions to COMPLETED (or ERROR on exception)
6. Session summary stored in long-term memory
7. Final state broadcast via WebSocket and SignalR
```

This architecture makes TaskPilot a fully autonomous agent capable of handling complex, multi-step project management workflows through natural language instructions.
