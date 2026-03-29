# TaskPilot AI Agent

**Autonomous Project Management with ReAct Reasoning**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![React Native](https://img.shields.io/badge/React_Native-Expo-61DAFB?logo=react&logoColor=white)](https://reactnative.dev/)
[![.NET](https://img.shields.io/badge/.NET-9.0-512BD4?logo=dotnet)](https://dotnet.microsoft.com/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)](https://python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**[Live Demo](https://taskpilot-ai-gamma.vercel.app)** | **[Deploy Backend to Render](https://render.com/deploy?repo=https://github.com/MusaevAkobirSanokulUgli/TaskPilot-AI-Agent)**

An autonomous AI agent that manages project workflows using a **ReAct (Reason-Act-Observe)** loop. TaskPilot triages bugs, assigns tasks, analyzes code, generates reports, and monitors project health — with a web dashboard and mobile companion app.

---

## Architecture

```
┌────────────────────┐  ┌──────────────────────┐
│  Next.js Web       │  │  React Native Mobile │
│  • Agent dashboard │  │  • Task notifications│
│  • Chat interface  │  │  • Quick actions      │
│  • Kanban board    │  │  • Agent chat         │
└────────┬───────────┘  └──────────┬───────────┘
         │ REST + SignalR           │ REST
┌────────▼──────────────────────────▼──────────┐
│  .NET 9 API                                  │
│  • Task & Project CRUD                       │
│  • Agent session management                  │
│  • Real-time updates (SignalR)               │
│  • Report storage (SQLite / EF Core)         │
└────────────────────┬─────────────────────────┘
                     │ HTTP + WebSocket
┌────────────────────▼─────────────────────────┐
│  Python Agent Core (FastAPI)                 │
│  • ReAct Loop: Reason → Plan → Act → Observe│
│  • 6 Tools: TaskManager, CodeAnalyzer,       │
│    ReportGenerator, WebSearcher, Notification│
│  • 3-Tier Memory: Short-term, Working,       │
│    Long-term                                 │
│  • DeepSeek LLM / Rule-based fallback       │
└──────────────────────────────────────────────┘
```

## How the Agent Works (ReAct Loop)

```
Instruction ─→ REASON ─→ PLAN ─→ ACT ─→ OBSERVE ─→ REMEMBER ─→ CHECK
                 │                  │                              │
                 │         ┌───────┘                     Done? ───┘
                 │         ▼                               │
                 │    Tool Execution                   No: Loop
                 │    (6 tools)                        Yes: Return
                 │
                 └── LLM or Rule-based reasoning
```

1. **Reason**: Analyze instruction + context using LLM
2. **Plan**: Select tools and determine execution order
3. **Act**: Execute tool(s) with computed arguments
4. **Observe**: Process tool results
5. **Remember**: Store interaction in 3-tier memory
6. **Check**: Goal achieved? If not, loop back to Reason

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Web Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| **Mobile App** | React Native (Expo) |
| **Backend** | .NET 9 Web API, Entity Framework Core, SQLite, SignalR |
| **Agent Core** | Python, FastAPI, ReAct loop with tool use |
| **LLM** | DeepSeek API (OpenAI-compatible) + rule-based fallback |
| **Containerization** | Docker, Docker Compose |

## Features

### AI Agent
- **Autonomous task triage**: Analyzes bugs/issues and assigns priority
- **Smart assignment**: Assigns tasks based on workload and expertise
- **Code analysis**: Reviews code structure and identifies issues
- **Report generation**: Daily/weekly status reports from project data
- **Proactive notifications**: Alerts about blockers, overdue tasks, risks
- **Mock LLM mode**: Works offline with rule-based reasoning fallback

### Agent Tools

| Tool | Description |
|------|-------------|
| `task_manager` | Create, update, assign, and prioritize tasks |
| `code_analyzer` | Analyze code structure, complexity, dependencies |
| `report_generator` | Generate project status and analytics reports |
| `web_searcher` | Search the web for relevant information |
| `notification` | Send alerts and notifications to team |

### Memory System

| Tier | Capacity | Purpose |
|------|----------|---------|
| **Short-term** | 20 entries | Current session context |
| **Working** | Dynamic | Active task data and intermediate results |
| **Long-term** | 500 entries | Persistent knowledge across sessions |

### Web Dashboard
- Real-time agent status via SignalR (idle/thinking/acting)
- Interactive chat with visible reasoning steps
- Kanban board with drag-and-drop
- Agent memory viewer and editor
- Auto-generated project reports

### Mobile Companion (Expo)
- Task feed with quick status updates
- Agent chat for on-the-go instructions
- Push notifications for agent actions
- Quick action buttons for common workflows

## Quick Start

### Docker Compose (recommended)

```bash
cp .env.example .env
# Edit .env with your DeepSeek API key (optional — works without it in mock mode)

docker compose up --build

# Web Dashboard:  http://localhost:3200
# Backend API:    http://localhost:5002/swagger
# Agent Core:     http://localhost:8001/docs
```

### Manual Setup

```bash
# 1. Agent Core
cd agent-core
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
OPENAI_API_KEY=sk-... python main.py

# 2. Backend
cd backend/TaskPilot.Api && dotnet run

# 3. Frontend
cd frontend && npm install && npm run dev

# 4. Mobile (optional)
cd mobile && npm install && npx expo start
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | DeepSeek API key (leave empty for mock mode) | — |
| `OPENAI_BASE_URL` | LLM API base URL | `https://api.deepseek.com` |
| `OPENAI_MODEL` | LLM model name | `deepseek-chat` |
| `MAX_ITERATIONS` | Max ReAct loop iterations | `10` |
| `AGENT_PORT` | Agent Core port | `8001` |

## API Endpoints

### .NET Backend

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/projects` | Project management |
| GET/POST/PUT/DELETE | `/api/tasks` | Task CRUD |
| POST | `/api/agent/run` | Start agent with instruction |
| GET | `/api/agent/status` | Agent status |
| GET/POST/PUT/DELETE | `/api/memory` | Memory management |
| GET | `/api/reports` | Reports |

### Agent Core (FastAPI)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/agent/run` | Execute agent (async) |
| POST | `/agent/run-sync` | Execute agent (synchronous) |
| GET | `/agent/status` | Current state + memory stats |
| POST | `/agent/stop` | Stop running agent |
| GET | `/agent/actions` | Action history |
| GET | `/agent/memory` | All memories by tier |
| POST | `/agent/memory` | Add memory entry |
| GET | `/agent/tools` | List available tools |
| WS | `/agent/stream` | Real-time event streaming |

## Project Structure

```
TaskPilot-AI-Agent/
├── frontend/               # Next.js 14 Dashboard
│   ├── src/app/            # Dashboard, Chat, Tasks, Memory, Reports
│   └── src/components/     # AgentChat, TaskCard, KanbanBoard, MemoryViewer
├── backend/                # .NET 9 Web API
│   └── TaskPilot.Api/
│       ├── Controllers/    # Agent, Tasks, Projects, Memory, Reports
│       ├── Models/         # TaskItem, Project, AgentSession, Memory, Report
│       ├── Services/       # AgentOrchestrator, TaskManagement, Reports
│       ├── Hubs/           # SignalR AgentHub
│       └── Data/           # EF Core DbContext
├── agent-core/             # Python ReAct Agent
│   ├── main.py             # FastAPI endpoints
│   ├── agent_loop.py       # Core ReAct loop
│   ├── planner.py          # Tool planning & selection
│   ├── memory_manager.py   # 3-tier memory system
│   └── tools/              # 6 agent tools
├── mobile/                 # React Native (Expo)
│   ├── src/screens/        # TaskFeed, Notifications, QuickActions, AgentChat
│   └── src/components/     # Mobile UI components
├── nginx/                  # Reverse proxy config
├── docs/                   # Architecture documentation
└── docker-compose.yml
```
