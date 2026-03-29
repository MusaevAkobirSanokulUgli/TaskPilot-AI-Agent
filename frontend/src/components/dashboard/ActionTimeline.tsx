"use client";

import { useEffect, useState } from "react";
import { getAgentActions } from "@/lib/api";

interface ActionEntry {
  id: string;
  action_type: string;
  tool_name: string;
  arguments: Record<string, unknown>;
  success: boolean;
  error: string | null;
  timestamp: string;
}

const toolIcons: Record<string, string> = {
  task_manager: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  code_analyzer: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4",
  report_generator: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  web_searcher: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  notification: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
};

const toolColors: Record<string, string> = {
  task_manager: "text-blue-600 bg-blue-50",
  code_analyzer: "text-purple-600 bg-purple-50",
  report_generator: "text-green-600 bg-green-50",
  web_searcher: "text-orange-600 bg-orange-50",
  notification: "text-pink-600 bg-pink-50",
};

export default function ActionTimeline() {
  const [actions, setActions] = useState<ActionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActions = async () => {
      try {
        const data = await getAgentActions();
        setActions((data.actions as unknown as ActionEntry[]) || []);
      } catch {
        setActions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchActions();
    const interval = setInterval(fetchActions, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Actions</h3>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : actions.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">No actions taken yet.</p>
          <p className="text-gray-400 text-xs mt-1">Send an instruction to the agent to get started.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
          {actions.slice(0, 15).map((action, index) => {
            const iconPath = toolIcons[action.tool_name] || toolIcons.task_manager;
            const colors = toolColors[action.tool_name] || "text-gray-600 bg-gray-50";
            const [textColor, bgColor] = colors.split(" ");

            return (
              <div key={action.id || index} className="flex gap-3 items-start">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${bgColor}`}>
                  <svg className={`w-4 h-4 ${textColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 capitalize">
                      {action.tool_name.replace(/_/g, " ")}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${action.success ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {action.success ? "Success" : "Failed"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {action.action_type} - {JSON.stringify(action.arguments).slice(0, 60)}...
                  </p>
                  {action.error && (
                    <p className="text-xs text-red-500 mt-0.5">{action.error}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">{formatTime(action.timestamp)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
