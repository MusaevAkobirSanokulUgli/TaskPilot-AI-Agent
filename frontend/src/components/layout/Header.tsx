"use client";

import { useEffect, useState } from "react";
import { getAgentStatus } from "@/lib/api";
import type { AgentState } from "@/lib/types";

const stateLabels: Record<AgentState, string> = {
  idle: "Idle",
  thinking: "Thinking...",
  planning: "Planning...",
  acting: "Acting...",
  observing: "Observing...",
  completed: "Completed",
  error: "Error",
  stopped: "Stopped",
};

const stateColors: Record<AgentState, string> = {
  idle: "bg-gray-400",
  thinking: "bg-amber-400 animate-pulse",
  planning: "bg-violet-400 animate-pulse",
  acting: "bg-blue-400 animate-pulse",
  observing: "bg-emerald-400 animate-pulse",
  completed: "bg-green-500",
  error: "bg-red-500",
  stopped: "bg-orange-500",
};

export default function Header() {
  const [agentState, setAgentState] = useState<AgentState>("idle");
  const [actionCount, setActionCount] = useState(0);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const status = await getAgentStatus();
        setAgentState((status.state as AgentState) || "idle");
        setActionCount((status.total_actions as number) || 0);
      } catch {
        setAgentState("idle");
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-gray-800">
          Project Management Dashboard
        </h2>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full">
          <span className={`w-2.5 h-2.5 rounded-full ${stateColors[agentState]}`} />
          <span className="text-sm font-medium text-gray-600">
            Agent: {stateLabels[agentState]}
          </span>
        </div>

        <div className="text-sm text-gray-500">
          {actionCount} actions taken
        </div>

        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
          <span className="text-sm font-semibold text-primary-700">U</span>
        </div>
      </div>
    </header>
  );
}
