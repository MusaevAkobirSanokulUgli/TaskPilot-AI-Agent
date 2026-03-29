export type AgentState =
  | "idle"
  | "thinking"
  | "planning"
  | "acting"
  | "observing"
  | "completed"
  | "error"
  | "stopped";

export type TaskStatus = "todo" | "open" | "in_progress" | "done" | "blocked";
export type TaskPriority = "critical" | "high" | "medium" | "low";

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string | null;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  dueDate: string | null;
  tags: string;
}

export interface AgentSession {
  session_id: string;
  state: AgentState;
  instruction: string;
  steps: AgentStep[];
  total_steps: number;
  started_at: string | null;
  completed_at: string | null;
  error: string | null;
}

export interface AgentStep {
  iteration: number;
  thought: { content: string; reasoning: string };
  plan: { goal: string; steps: string[] };
  actions: { tool_name: string; arguments: Record<string, unknown>; success: boolean; error: string | null }[];
  observation: { content: string; source: string };
  is_final: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: Date;
}
