"use client";

import AgentStatus from "@/components/dashboard/AgentStatus";
import ActionTimeline from "@/components/dashboard/ActionTimeline";
import ProjectHealth from "@/components/dashboard/ProjectHealth";
import { useState } from "react";
import { runAgent } from "@/lib/api";

export default function DashboardPage() {
  const [quickInstruction, setQuickInstruction] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const handleQuickRun = async (instruction: string) => {
    setIsRunning(true);
    setLastResult(null);
    try {
      const session = await runAgent(instruction);
      setLastResult(
        `Completed in ${session.total_steps} step(s). State: ${session.state}`
      );
    } catch (err) {
      setLastResult(
        `Error: ${err instanceof Error ? err.message : "Failed to reach agent"}`
      );
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Quick instruction bar */}
      <div className="card">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={quickInstruction}
              onChange={(e) => setQuickInstruction(e.target.value)}
              placeholder="Give the agent a quick instruction..."
              className="input"
              onKeyDown={(e) => {
                if (e.key === "Enter" && quickInstruction.trim()) {
                  handleQuickRun(quickInstruction);
                  setQuickInstruction("");
                }
              }}
              disabled={isRunning}
            />
          </div>
          <button
            onClick={() => {
              if (quickInstruction.trim()) {
                handleQuickRun(quickInstruction);
                setQuickInstruction("");
              }
            }}
            disabled={!quickInstruction.trim() || isRunning}
            className="btn-primary flex items-center gap-2"
          >
            {isRunning ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            )}
            Run
          </button>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2 mt-3">
          {[
            { label: "Triage Bugs", instruction: "Triage all open bugs and assign priorities" },
            { label: "Weekly Report", instruction: "Generate a weekly status report" },
            { label: "Assign Tasks", instruction: "Assign unassigned tasks to team members" },
            { label: "Code Analysis", instruction: "Analyze code and find potential issues" },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => handleQuickRun(action.instruction)}
              disabled={isRunning}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              {action.label}
            </button>
          ))}
        </div>

        {lastResult && (
          <div className={`mt-3 p-3 rounded-lg text-sm ${
            lastResult.startsWith("Error") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
          }`}>
            {lastResult}
          </div>
        )}
      </div>

      {/* Dashboard grid */}
      <div className="grid grid-cols-3 gap-6">
        <AgentStatus />
        <ProjectHealth />
        <ActionTimeline />
      </div>
    </div>
  );
}
