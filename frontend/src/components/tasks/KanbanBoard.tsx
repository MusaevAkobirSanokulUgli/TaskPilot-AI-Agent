"use client";

import { useEffect, useState, useCallback } from "react";
import { getTasks, updateTaskStatus, createTask, deleteTask } from "@/lib/api";
import type { TaskItem, TaskStatus } from "@/lib/types";
import TaskCard from "./TaskCard";

interface Column {
  id: TaskStatus;
  title: string;
  color: string;
  bgColor: string;
}

const columns: Column[] = [
  { id: "todo", title: "To Do", color: "text-gray-600", bgColor: "bg-gray-50" },
  { id: "in_progress", title: "In Progress", color: "text-blue-600", bgColor: "bg-blue-50" },
  { id: "done", title: "Done", color: "text-green-600", bgColor: "bg-green-50" },
  { id: "blocked", title: "Blocked", color: "text-red-600", bgColor: "bg-red-50" },
];

export default function KanbanBoard() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("medium");

  const fetchTasks = useCallback(async () => {
    try {
      const data = await getTasks();
      setTasks(data);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const getColumnTasks = (status: TaskStatus): TaskItem[] => {
    return tasks.filter((t) => {
      if (status === "todo") return t.status === "todo" || t.status === "open";
      return t.status === status;
    });
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(null);

    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === targetStatus) return;

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: targetStatus } : t))
    );

    try {
      await updateTaskStatus(taskId, targetStatus);
    } catch {
      // Revert on failure
      fetchTasks();
    }
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;

    try {
      await createTask({
        title: newTaskTitle,
        description: "",
        status: "todo",
        priority: newTaskPriority as TaskItem["priority"],
        projectId: "proj-001",
        tags: "[]",
      });
      setNewTaskTitle("");
      setNewTaskPriority("medium");
      setShowAddForm(false);
      fetchTasks();
    } catch (err) {
      console.error("Failed to create task:", err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      await deleteTask(taskId);
    } catch {
      fetchTasks();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Task Board</h2>
          <p className="text-sm text-gray-500">{tasks.length} tasks total</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Task
        </button>
      </div>

      {/* Add task form */}
      {showAddForm && (
        <div className="card mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">New Task</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Task title..."
              className="input flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
            />
            <select
              value={newTaskPriority}
              onChange={(e) => setNewTaskPriority(e.target.value)}
              className="input w-32"
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <button onClick={handleAddTask} className="btn-primary">Create</button>
            <button onClick={() => setShowAddForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* Kanban columns */}
      <div className="grid grid-cols-4 gap-4">
        {columns.map((column) => {
          const columnTasks = getColumnTasks(column.id);
          const isDragOver = dragOverColumn === column.id;

          return (
            <div
              key={column.id}
              className={`rounded-xl p-4 min-h-[400px] transition-colors duration-200 ${
                isDragOver ? "bg-primary-50 ring-2 ring-primary-300" : column.bgColor
              }`}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {/* Column header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className={`text-sm font-semibold ${column.color}`}>
                    {column.title}
                  </h3>
                  <span className="text-xs text-gray-400 bg-white px-2 py-0.5 rounded-full">
                    {columnTasks.length}
                  </span>
                </div>
              </div>

              {/* Task cards */}
              <div className="space-y-3">
                {columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onDelete={handleDeleteTask}
                  />
                ))}

                {columnTasks.length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                    Drop tasks here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
