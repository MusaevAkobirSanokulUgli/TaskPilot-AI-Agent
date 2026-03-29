"use client";

import type { AgentActionItem } from "@/lib/types";

interface ActionCardProps {
  action: AgentActionItem;
}

const toolLabels: Record<string, string> = {
  task_manager: "Task Manager",
  code_analyzer: "Code Analyzer",
  report_generator: "Report Generator",
  web_searcher: "Web Search",
  notification: "Notification",
};

const toolBadgeColors: Record<string, string> = {
  task_manager: "bg-blue-100 text-blue-700",
  code_analyzer: "bg-purple-100 text-purple-700",
  report_generator: "bg-green-100 text-green-700",
  web_searcher: "bg-orange-100 text-orange-700",
  notification: "bg-pink-100 text-pink-700",
};

export default function ActionCard({ action }: ActionCardProps) {
  const label = toolLabels[action.tool_name] || action.tool_name;
  const badgeColor = toolBadgeColors[action.tool_name] || "bg-gray-100 text-gray-700";
  const actionType = (action.arguments?.action as string) || "execute";

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${badgeColor}`}>
          {label}
        </span>
        <span className="text-xs text-gray-500 capitalize">{actionType}</span>
        <span className="ml-auto">
          {action.success ? (
            <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </span>
      </div>

      {action.error && (
        <p className="text-xs text-red-600 bg-red-50 p-2 rounded mb-2">{action.error}</p>
      )}

      <details className="group">
        <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
          View arguments
        </summary>
        <pre className="text-xs text-gray-500 mt-1 p-2 bg-gray-50 rounded overflow-x-auto">
          {JSON.stringify(action.arguments, null, 2)}
        </pre>
      </details>
    </div>
  );
}
