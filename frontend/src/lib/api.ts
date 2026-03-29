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

// ---- Projects ----
export async function getProjects(): Promise<Project[]> {
  return fetchJson<Project[]>(`${API_BASE}/api/projects`);
}

export async function getProject(id: string): Promise<Project> {
  return fetchJson<Project>(`${API_BASE}/api/projects/${id}`);
}

// ---- Tasks ----
export async function getTasks(params?: {
  projectId?: string;
  status?: string;
  priority?: string;
  assignee?: string;
}): Promise<TaskItem[]> {
  const searchParams = new URLSearchParams();
  if (params?.projectId) searchParams.set("projectId", params.projectId);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.priority) searchParams.set("priority", params.priority);
  if (params?.assignee) searchParams.set("assignee", params.assignee);

  const qs = searchParams.toString();
  return fetchJson<TaskItem[]>(`${API_BASE}/api/tasks${qs ? `?${qs}` : ""}`);
}

export async function getTaskStats(projectId?: string): Promise<TaskStats> {
  const qs = projectId ? `?projectId=${projectId}` : "";
  return fetchJson<TaskStats>(`${API_BASE}/api/tasks/stats${qs}`);
}

export async function createTask(
  task: Partial<TaskItem>
): Promise<TaskItem> {
  return fetchJson<TaskItem>(`${API_BASE}/api/tasks`, {
    method: "POST",
    body: JSON.stringify(task),
  });
}

export async function updateTask(
  id: string,
  updates: Partial<TaskItem>
): Promise<TaskItem> {
  return fetchJson<TaskItem>(`${API_BASE}/api/tasks/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export async function updateTaskStatus(
  id: string,
  status: string
): Promise<TaskItem> {
  return fetchJson<TaskItem>(`${API_BASE}/api/tasks/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

export async function deleteTask(id: string): Promise<void> {
  await fetch(`${API_BASE}/api/tasks/${id}`, { method: "DELETE" });
}

// ---- Agent ----
export async function runAgent(
  instruction: string,
  options?: { projectId?: string; autonomyLevel?: string }
): Promise<AgentSession> {
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
  return fetchJson<Record<string, unknown>>(`${AGENT_BASE}/agent/status`);
}

export async function stopAgent(): Promise<{ status: string }> {
  return fetchJson<{ status: string }>(`${AGENT_BASE}/agent/stop`, {
    method: "POST",
  });
}

export async function getAgentActions(): Promise<{
  actions: Record<string, unknown>[];
  total: number;
}> {
  return fetchJson(`${AGENT_BASE}/agent/actions`);
}

// ---- Memory ----
export async function getMemories(): Promise<MemoryCollection> {
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
  return fetchJson<Report>(`${API_BASE}/api/reports/generate`, {
    method: "POST",
    body: JSON.stringify({ projectId, reportType }),
  });
}

export async function deleteReport(id: string): Promise<void> {
  await fetch(`${API_BASE}/api/reports/${id}`, { method: "DELETE" });
}
