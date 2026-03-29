"use client";

import { useEffect, useState } from "react";
import { getTaskStats } from "@/lib/api";
import type { TaskStats } from "@/lib/types";

export default function ProjectHealth() {
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getTaskStats("proj-001");
        setStats(data);
      } catch {
        setStats(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Health</h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Health</h3>
        <p className="text-gray-500 text-sm">Unable to load project metrics.</p>
      </div>
    );
  }

  const healthScore = Math.min(100, Math.round(
    stats.completionRate * 0.4 +
    (100 - (stats.byPriority.critical * 20)) * 0.3 +
    (100 - (stats.unassigned / Math.max(stats.total, 1) * 100)) * 0.3
  ));

  const healthColor = healthScore >= 70 ? "text-green-600" : healthScore >= 40 ? "text-yellow-600" : "text-red-600";
  const healthBg = healthScore >= 70 ? "bg-green-50" : healthScore >= 40 ? "bg-yellow-50" : "bg-red-50";
  const healthLabel = healthScore >= 70 ? "Healthy" : healthScore >= 40 ? "Needs Attention" : "At Risk";

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Project Health</h3>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${healthBg} ${healthColor}`}>
          {healthLabel}
        </div>
      </div>

      {/* Health Score */}
      <div className="flex items-center justify-center mb-6">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="3"
            />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke={healthScore >= 70 ? "#22c55e" : healthScore >= 40 ? "#eab308" : "#ef4444"}
              strokeWidth="3"
              strokeDasharray={`${healthScore}, 100`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-bold ${healthColor}`}>{healthScore}</span>
            <span className="text-xs text-gray-400">/ 100</span>
          </div>
        </div>
      </div>

      {/* Status breakdown */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Completion Rate</span>
          <span className="text-sm font-medium text-gray-900">{stats.completionRate}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${stats.completionRate}%` }}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-xl font-bold text-blue-700">{stats.byStatus.inProgress}</p>
            <p className="text-xs text-blue-500">In Progress</p>
          </div>
          <div className="p-3 bg-red-50 rounded-lg">
            <p className="text-xl font-bold text-red-700">{stats.byPriority.critical}</p>
            <p className="text-xs text-red-500">Critical</p>
          </div>
          <div className="p-3 bg-orange-50 rounded-lg">
            <p className="text-xl font-bold text-orange-700">{stats.unassigned}</p>
            <p className="text-xs text-orange-500">Unassigned</p>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg">
            <p className="text-xl font-bold text-purple-700">{stats.overdueCount}</p>
            <p className="text-xs text-purple-500">Overdue</p>
          </div>
        </div>
      </div>
    </div>
  );
}
