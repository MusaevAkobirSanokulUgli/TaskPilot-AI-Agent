"use client";

import { useEffect, useState } from "react";
import { getAgentStatus } from "@/lib/api";
import type { AgentState } from "@/lib/types";

const stateConfig: Record<AgentState, { label: string; color: string; bgColor: string; description: string }> = {
  idle: { label: "Idle", color: "text-gray-600", bgColor: "bg-gray-100", description: "Waiting for instructions" },
  thinking: { label: "Thinking", color: "text-amber-600", bgColor: "bg-amber-50", description: "Analyzing the situation" },
  planning: { label: "Planning", color: "text-violet-600", bgColor: "bg-violet-50", description: "Creating an action plan" },
  acting: { label: "Acting", color: "text-blue-600", bgColor: "bg-blue-50", description: "Executing tools" },
  observing: { label: "Observing", color: "text-emerald-600", bgColor: "bg-emerald-50", description: "Processing results" },
  completed: { label: "Completed", color: "text-green-600", bgColor: "bg-green-50", description: "Task finished successfully" },
  error: { label: "Error", color: "text-red-600", bgColor: "bg-red-50", description: "Something went wrong" },
  stopped: { label: "Stopped", color: "text-orange-600", bgColor: "bg-orange-50", description: "Manually stopped" },
};

const stateIcons: Record<AgentState, string> = {
  idle: "M20 12H4",
  thinking: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
  planning: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  acting: "M13 10V3L4 14h7v7l9-11h-7z",
  observing: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
  completed: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  error: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  stopped: "M21 12a9 9 0 11-18 0 9 9 0 0118 0z M10 15V9m4 6V9",
};

export default function AgentStatus() {
  const [state, setState] = useState<AgentState>("idle");
  const [totalActions, setTotalActions] = useState(0);
  const [uptime, setUptime] = useState(0);
  const [memoryStats, setMemoryStats] = useState({ short_term: 0, working: 0, long_term: 0 });
  const [tools, setTools] = useState<string[]>([]);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const status = await getAgentStatus();
        setState((status.state as AgentState) || "idle");
        setTotalActions((status.total_actions as number) || 0);
        setUptime((status.uptime_seconds as number) || 0);
        if (status.memory_stats) {
          setMemoryStats(status.memory_stats as typeof memoryStats);
        }
        if (status.available_tools) {
          setTools(status.available_tools as string[]);
        }
      } catch {
        setState("idle");
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const config = stateConfig[state];
  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}h ${m}m ${s}s`;
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Agent Status</h3>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.color}`}>
          {config.label}
        </div>
      </div>

      <div className={`p-4 rounded-lg ${config.bgColor} mb-4`}>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${config.color}`} style={{ backgroundColor: "rgba(255,255,255,0.6)" }}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d={stateIcons[state]} />
            </svg>
          </div>
          <div>
            <p className={`font-medium ${config.color}`}>{config.label}</p>
            <p className="text-sm text-gray-500">{config.description}</p>
          </div>
          {(state === "thinking" || state === "planning" || state === "acting" || state === "observing") && (
            <div className="ml-auto">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-2xl font-bold text-gray-900">{totalActions}</p>
          <p className="text-xs text-gray-500">Total Actions</p>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-2xl font-bold text-gray-900">{formatUptime(uptime)}</p>
          <p className="text-xs text-gray-500">Uptime</p>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm font-medium text-gray-600 mb-2">Memory</p>
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 bg-blue-50 rounded">
            <p className="text-lg font-semibold text-blue-700">{memoryStats.short_term}</p>
            <p className="text-xs text-blue-500">Short-term</p>
          </div>
          <div className="text-center p-2 bg-purple-50 rounded">
            <p className="text-lg font-semibold text-purple-700">{memoryStats.working}</p>
            <p className="text-xs text-purple-500">Working</p>
          </div>
          <div className="text-center p-2 bg-green-50 rounded">
            <p className="text-lg font-semibold text-green-700">{memoryStats.long_term}</p>
            <p className="text-xs text-green-500">Long-term</p>
          </div>
        </div>
      </div>

      {tools.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-600 mb-2">Available Tools</p>
          <div className="flex flex-wrap gap-1.5">
            {tools.map((tool) => (
              <span key={tool} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
                {tool}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
