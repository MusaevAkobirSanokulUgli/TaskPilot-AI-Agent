import type { TaskItem, AgentSession } from "./types";

// Both APIs are proxied through p3-nginx on port 8082
const API_BASE = "http://localhost:8082";
const AGENT_BASE = "http://localhost:8082";

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "Unknown error");
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  return response.json();
}

export async function getTasks(): Promise<TaskItem[]> {
  return fetchJson<TaskItem[]>(`${API_BASE}/api/tasks`);
}

export async function updateTaskStatus(id: string, status: string): Promise<TaskItem> {
  return fetchJson<TaskItem>(`${API_BASE}/api/tasks/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

export async function runAgent(instruction: string): Promise<AgentSession> {
  return fetchJson<AgentSession>(`${AGENT_BASE}/agent/run-sync`, {
    method: "POST",
    body: JSON.stringify({
      instruction,
      autonomy_level: "supervised",
    }),
  });
}

export async function getAgentStatus(): Promise<Record<string, unknown>> {
  return fetchJson<Record<string, unknown>>(`${AGENT_BASE}/agent/status`);
}
