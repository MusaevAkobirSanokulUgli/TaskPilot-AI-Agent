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
export type MemoryType = "short_term" | "working" | "long_term";
export type ReportType = "daily" | "weekly" | "standup" | "sprint" | "status";

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

export interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
  tasks: TaskItem[];
}

export interface AgentStep {
  iteration: number;
  thought: {
    content: string;
    reasoning: string;
  };
  plan: {
    goal: string;
    steps: string[];
  };
  actions: AgentActionItem[];
  observation: {
    content: string;
    source: string;
  };
  is_final: boolean;
}

export interface AgentActionItem {
  id?: string;
  tool_name: string;
  arguments: Record<string, unknown>;
  success: boolean;
  error: string | null;
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

export interface MemoryEntry {
  id: string;
  content: string;
  memoryType: MemoryType;
  metadata: string | Record<string, unknown>;
  createdAt: string;
  relevanceScore: number;
}

export interface MemoryCollection {
  short_term: MemoryEntry[];
  working: MemoryEntry[];
  long_term: MemoryEntry[];
}

export interface Report {
  id: string;
  title: string;
  reportType: ReportType;
  content: string;
  metricsJson: string;
  projectId: string;
  generatedAt: string;
  generatedBy: string;
}

export interface TaskStats {
  total: number;
  byStatus: {
    todo: number;
    open: number;
    inProgress: number;
    done: number;
    blocked: number;
  };
  byPriority: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  unassigned: number;
  completionRate: number;
  overdueCount: number;
}

export interface StreamEvent {
  event_type: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  type?: "thought" | "plan" | "action" | "observation" | "message";
  data?: Record<string, unknown>;
  timestamp: Date;
}
