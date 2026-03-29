"use client";

import type { TaskItem } from "@/lib/types";

interface TaskCardProps {
  task: TaskItem;
  onEdit?: (task: TaskItem) => void;
  onDelete?: (taskId: string) => void;
  isDragging?: boolean;
}

const priorityConfig: Record<string, { label: string; className: string }> = {
  critical: { label: "Critical", className: "bg-red-100 text-red-800" },
  high: { label: "High", className: "bg-orange-100 text-orange-800" },
  medium: { label: "Medium", className: "bg-yellow-100 text-yellow-800" },
  low: { label: "Low", className: "bg-green-100 text-green-800" },
};

export default function TaskCard({ task, onEdit, onDelete, isDragging }: TaskCardProps) {
  const priority = priorityConfig[task.priority] || priorityConfig.medium;
  let tags: string[] = [];
  try {
    tags = JSON.parse(task.tags || "[]");
  } catch {
    tags = [];
  }

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div
      className={`bg-white border rounded-lg p-3 shadow-sm hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-50 rotate-2 scale-105" : ""
      } ${isOverdue ? "border-red-300" : "border-gray-200"}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", task.id);
        e.dataTransfer.effectAllowed = "move";
      }}
    >
      {/* Priority + actions */}
      <div className="flex items-center justify-between mb-2">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priority.className}`}>
          {priority.label}
        </span>
        <div className="flex items-center gap-1">
          {isOverdue && (
            <span className="text-xs text-red-500 font-medium">Overdue</span>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Title */}
      <h4
        className="text-sm font-medium text-gray-900 mb-1 cursor-pointer hover:text-primary-600"
        onClick={() => onEdit?.(task)}
      >
        {task.title}
      </h4>

      {/* Description preview */}
      {task.description && (
        <p className="text-xs text-gray-500 mb-2 line-clamp-2">{task.description}</p>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {tags.map((tag) => (
            <span key={tag} className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
        {task.assignee ? (
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-primary-700">
                {task.assignee.charAt(0)}
              </span>
            </div>
            <span className="text-xs text-gray-600">{task.assignee}</span>
          </div>
        ) : (
          <span className="text-xs text-gray-400 italic">Unassigned</span>
        )}

        {task.dueDate && (
          <span className={`text-xs ${isOverdue ? "text-red-500 font-medium" : "text-gray-400"}`}>
            {formatDate(task.dueDate)}
          </span>
        )}
      </div>
    </div>
  );
}
