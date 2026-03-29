import type {
  TaskItem,
  TaskStats,
  AgentSession,
  MemoryCollection,
  MemoryEntry,
  Report,
  Project,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
const AGENT_BASE = process.env.NEXT_PUBLIC_AGENT_URL || "";

/** True when no backend URLs are configured (e.g. Vercel-only deployment) */
const IS_DEMO_MODE = !API_BASE && !AGENT_BASE;

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  return response.json();
}

// ---- Demo Data (used when backend is not connected) ----
const DEMO_TASKS: TaskItem[] = [
  {
    id: "demo-task-1", title: "Set up CI/CD pipeline", description: "Configure GitHub Actions for automated testing and deployment", status: "todo", priority: "high", assignee: "Agent", projectId: "demo-project-1", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), dueDate: null, tags: "devops",
  },
  {
    id: "demo-task-2", title: "Fix authentication bug", description: "Users are logged out after 5 minutes — investigate session handling", status: "in_progress", priority: "critical", assignee: "Agent", projectId: "demo-project-1", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), dueDate: null, tags: "bug",
  },
  {
    id: "demo-task-3", title: "Add dark mode support", description: "Implement dark mode toggle using Tailwind CSS dark variant", status: "done", priority: "medium", assignee: "Developer", projectId: "demo-project-1", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), dueDate: null, tags: "feature",
  },
  {
    id: "demo-task-4", title: "Write API documentation", description: "Document all REST endpoints with request/response examples", status: "todo", priority: "low", assignee: "Developer", projectId: "demo-project-1", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), dueDate: null, tags: "docs",
  },
];

const DEMO_PROJECT: Project = {
  id: "demo-project-1",
  name: "Sample Project",
  description: "This is demo data — deploy the backend to enable full functionality.",
  status: "active",
  owner: "Demo User",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  tasks: DEMO_TASKS,
};

const DEMO_STATS: TaskStats = {
  total: 4,
  byStatus: { todo: 2, open: 0, inProgress: 1, done: 1, blocked: 0 },
  byPriority: { critical: 1, high: 1, medium: 1, low: 1 },
  unassigned: 0,
  completionRate: 25,
  overdueCount: 0,
};

// ---- Projects ----
export async function getProjects(): Promise<Project[]> {
  if (IS_DEMO_MODE) return [DEMO_PROJECT];
  return fetchJson<Project[]>(`${API_BASE}/api/projects`);
}

export async function getProject(id: string): Promise<Project> {
  if (IS_DEMO_MODE) return DEMO_PROJECT;
  return fetchJson<Project>(`${API_BASE}/api/projects/${id}`);
}

// ---- Tasks ----
export async function getTasks(params?: {
  projectId?: string;
  status?: string;
  priority?: string;
  assignee?: string;
}): Promise<TaskItem[]> {
  if (IS_DEMO_MODE) {
    let tasks = [...DEMO_TASKS];
    if (params?.status) tasks = tasks.filter(t => t.status === params.status);
    if (params?.priority) tasks = tasks.filter(t => t.priority === params.priority);
    return tasks;
  }
  const searchParams = new URLSearchParams();
  if (params?.projectId) searchParams.set("projectId", params.projectId);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.priority) searchParams.set("priority", params.priority);
  if (params?.assignee) searchParams.set("assignee", params.assignee);

  const qs = searchParams.toString();
  return fetchJson<TaskItem[]>(`${API_BASE}/api/tasks${qs ? `?${qs}` : ""}`);
}

export async function getTaskStats(projectId?: string): Promise<TaskStats> {
  if (IS_DEMO_MODE) return DEMO_STATS;
  const qs = projectId ? `?projectId=${projectId}` : "";
  return fetchJson<TaskStats>(`${API_BASE}/api/tasks/stats${qs}`);
}

export async function createTask(
  task: Partial<TaskItem>
): Promise<TaskItem> {
  if (IS_DEMO_MODE) {
    const newTask: TaskItem = {
      id: `demo-task-${Date.now()}`,
      title: task.title || "New Task",
      description: task.description || "",
      status: task.status || "todo",
      priority: task.priority || "medium",
      assignee: task.assignee || null,
      projectId: task.projectId || "demo-project-1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dueDate: null,
      tags: "",
    };
    DEMO_TASKS.push(newTask);
    return newTask;
  }
  return fetchJson<TaskItem>(`${API_BASE}/api/tasks`, {
    method: "POST",
    body: JSON.stringify(task),
  });
}

export async function updateTask(
  id: string,
  updates: Partial<TaskItem>
): Promise<TaskItem> {
  if (IS_DEMO_MODE) {
    const task = DEMO_TASKS.find(t => t.id === id);
    if (task) Object.assign(task, updates, { updatedAt: new Date().toISOString() });
    return task || { ...updates, id } as TaskItem;
  }
  return fetchJson<TaskItem>(`${API_BASE}/api/tasks/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export async function updateTaskStatus(
  id: string,
  status: string
): Promise<TaskItem> {
  if (IS_DEMO_MODE) {
    const task = DEMO_TASKS.find(t => t.id === id);
    if (task) { task.status = status as TaskItem["status"]; task.updatedAt = new Date().toISOString(); }
    return task || { id, status } as TaskItem;
  }
  return fetchJson<TaskItem>(`${API_BASE}/api/tasks/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

export async function deleteTask(id: string): Promise<void> {
  if (IS_DEMO_MODE) {
    const idx = DEMO_TASKS.findIndex(t => t.id === id);
    if (idx >= 0) DEMO_TASKS.splice(idx, 1);
    return;
  }
  const resp = await fetch(`${API_BASE}/api/tasks/${id}`, { method: "DELETE" });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: Failed to delete task`);
}

// ---- Agent ----
export async function runAgent(
  instruction: string,
  options?: { projectId?: string; autonomyLevel?: string }
): Promise<AgentSession> {
  if (IS_DEMO_MODE) {
    // Simulate agent response in demo mode
    return {
      session_id: `demo-session-${Date.now()}`,
      state: "completed",
      instruction,
      steps: [
        {
          iteration: 1,
          thought: { content: `Analyzing: "${instruction}"`, reasoning: "Demo mode — rule-based reasoning" },
          plan: { goal: instruction, steps: ["Analyze request", "Return demo result"] },
          actions: [{ tool_name: "task_manager", arguments: { action: "analyze" }, success: true, error: null }],
          observation: { content: `[Demo Mode] Processed: "${instruction}". Deploy the backend (Python Agent Core + .NET API) to unlock autonomous task triage, code analysis, report generation, and smart assignment.`, source: "demo" },
          is_final: true,
        },
      ],
      total_steps: 1,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      error: null,
    } satisfies AgentSession;
  }
  return fetchJson<AgentSession>(`${AGENT_BASE}/agent/run-sync`, {
    method: "POST",
    body: JSON.stringify({
      instruction,
      project_id: options?.projectId,
      autonomy_level: options?.autonomyLevel || "supervised",
    }),
  });
}

export async function getAgentStatus(): Promise<Record<string, unknown>> {
  if (IS_DEMO_MODE) return { state: "idle", mode: "demo", memory: { shortTerm: 0, working: 0, longTerm: 0 } };
  return fetchJson<Record<string, unknown>>(`${AGENT_BASE}/agent/status`);
}

export async function stopAgent(): Promise<{ status: string }> {
  if (IS_DEMO_MODE) return { status: "stopped" };
  return fetchJson<{ status: string }>(`${AGENT_BASE}/agent/stop`, {
    method: "POST",
  });
}

export async function getAgentActions(): Promise<{
  actions: Record<string, unknown>[];
  total: number;
}> {
  if (IS_DEMO_MODE) return { actions: [], total: 0 };
  return fetchJson(`${AGENT_BASE}/agent/actions`);
}

// ---- Memory ----
export async function getMemories(): Promise<MemoryCollection> {
  if (IS_DEMO_MODE) {
    return {
      short_term: [{ id: "demo-mem-1", content: "Demo mode — deploy backend for persistent memory", memoryType: "short_term", metadata: {}, createdAt: new Date().toISOString(), relevanceScore: 1.0 }],
      working: [],
      long_term: [],
    } satisfies MemoryCollection;
  }
  try {
    return await fetchJson<MemoryCollection>(`${AGENT_BASE}/agent/memory`);
  } catch {
    return await fetchJson<MemoryCollection>(`${API_BASE}/api/memory`);
  }
}

export async function addMemory(
  content: string,
  memoryType: string,
  metadata?: Record<string, unknown>
): Promise<MemoryEntry> {
  if (IS_DEMO_MODE) {
    return { id: `demo-mem-${Date.now()}`, content, memoryType, metadata, createdAt: new Date().toISOString() } as MemoryEntry;
  }
  try {
    return await fetchJson<MemoryEntry>(`${AGENT_BASE}/agent/memory`, {
      method: "POST",
      body: JSON.stringify({ content, memory_type: memoryType, metadata }),
    });
  } catch {
    return await fetchJson<MemoryEntry>(`${API_BASE}/api/memory`, {
      method: "POST",
      body: JSON.stringify({ content, memoryType, metadata }),
    });
  }
}

export async function deleteMemory(id: string): Promise<void> {
  if (IS_DEMO_MODE) return;
  try {
    await fetch(`${AGENT_BASE}/agent/memory/${id}`, { method: "DELETE" });
  } catch {
    await fetch(`${API_BASE}/api/memory/${id}`, { method: "DELETE" });
  }
}

export async function updateMemory(
  id: string,
  content: string
): Promise<MemoryEntry> {
  if (IS_DEMO_MODE) {
    return { id, content, memoryType: "short_term", createdAt: new Date().toISOString() } as MemoryEntry;
  }
  try {
    return await fetchJson<MemoryEntry>(`${AGENT_BASE}/agent/memory/${id}`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    });
  } catch {
    return await fetchJson<MemoryEntry>(`${API_BASE}/api/memory/${id}`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    });
  }
}

// ---- Reports ----
export async function getReports(params?: {
  projectId?: string;
  reportType?: string;
}): Promise<Report[]> {
  if (IS_DEMO_MODE) {
    return [{
      id: "demo-report-1",
      title: "Weekly Status Report",
      reportType: "weekly" as const,
      content: "## Demo Report\n\n**Tasks Completed:** 1\n**In Progress:** 1\n**Blockers:** None\n\n*Deploy the backend to generate real AI-powered reports.*",
      metricsJson: "{}",
      projectId: "demo-project-1",
      generatedAt: new Date().toISOString(),
      generatedBy: "demo",
    }] satisfies Report[];
  }
  const searchParams = new URLSearchParams();
  if (params?.projectId) searchParams.set("projectId", params.projectId);
  if (params?.reportType) searchParams.set("reportType", params.reportType);

  const qs = searchParams.toString();
  return fetchJson<Report[]>(`${API_BASE}/api/reports${qs ? `?${qs}` : ""}`);
}

export async function generateReport(
  projectId: string,
  reportType: string
): Promise<Report> {
  if (IS_DEMO_MODE) {
    return {
      id: `demo-report-${Date.now()}`,
      title: `${reportType} Report (Demo)`,
      reportType: reportType as Report["reportType"],
      content: `## ${reportType} Report\n\n*This is a demo report. Deploy the backend with the Python Agent Core to enable AI-generated reports with real project analysis.*`,
      metricsJson: "{}",
      projectId,
      generatedAt: new Date().toISOString(),
      generatedBy: "demo",
    } satisfies Report;
  }
  return fetchJson<Report>(`${API_BASE}/api/reports/generate`, {
    method: "POST",
    body: JSON.stringify({ projectId, reportType }),
  });
}

export async function deleteReport(id: string): Promise<void> {
  if (IS_DEMO_MODE) return;
  const resp = await fetch(`${API_BASE}/api/reports/${id}`, { method: "DELETE" });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: Failed to delete report`);
}

/** Returns true if running in demo mode (no backend configured) */
export function isDemoMode(): boolean {
  return IS_DEMO_MODE;
}
