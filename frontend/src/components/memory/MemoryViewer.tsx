"use client";

import { useEffect, useState, useCallback } from "react";
import { getMemories, addMemory, deleteMemory, updateMemory } from "@/lib/api";
import type { MemoryCollection, MemoryEntry, MemoryType } from "@/lib/types";

const tierConfig: Record<MemoryType, { label: string; description: string; color: string; bgColor: string; icon: string }> = {
  short_term: {
    label: "Short-term Memory",
    description: "Current conversation context (rolling window)",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  working: {
    label: "Working Memory",
    description: "Active task state and observations",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z",
  },
  long_term: {
    label: "Long-term Memory",
    description: "Persistent learned patterns and past interactions",
    color: "text-green-600",
    bgColor: "bg-green-50",
    icon: "M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4",
  },
};

export default function MemoryViewer() {
  const [memories, setMemories] = useState<MemoryCollection>({ short_term: [], working: [], long_term: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<MemoryType>("short_term");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState<MemoryType>("long_term");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const fetchMemories = useCallback(async () => {
    try {
      const data = await getMemories();
      setMemories(data);
    } catch {
      setMemories({ short_term: [], working: [], long_term: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  const handleAdd = async () => {
    if (!newContent.trim()) return;
    try {
      await addMemory(newContent, newType);
      setNewContent("");
      setShowAddForm(false);
      fetchMemories();
    } catch (err) {
      console.error("Failed to add memory:", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMemory(id);
      fetchMemories();
    } catch (err) {
      console.error("Failed to delete memory:", err);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editContent.trim()) return;
    try {
      await updateMemory(id, editContent);
      setEditingId(null);
      setEditContent("");
      fetchMemories();
    } catch (err) {
      console.error("Failed to update memory:", err);
    }
  };

  const startEdit = (entry: MemoryEntry) => {
    setEditingId(entry.id);
    setEditContent(entry.content);
  };

  const currentMemories = memories[activeTab] || [];
  const config = tierConfig[activeTab];

  const totalCount =
    (memories.short_term?.length || 0) +
    (memories.working?.length || 0) +
    (memories.long_term?.length || 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Agent Memory</h2>
          <p className="text-sm text-gray-500">{totalCount} memories across all tiers</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Memory
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="card mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Add Memory Entry</h3>
          <div className="space-y-3">
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Memory content..."
              className="input min-h-[80px]"
            />
            <div className="flex gap-3">
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as MemoryType)}
                className="input w-40"
              >
                <option value="short_term">Short-term</option>
                <option value="working">Working</option>
                <option value="long_term">Long-term</option>
              </select>
              <button onClick={handleAdd} className="btn-primary">Add</button>
              <button onClick={() => setShowAddForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Memory tier tabs */}
      <div className="flex gap-2 mb-6">
        {(Object.keys(tierConfig) as MemoryType[]).map((tier) => {
          const tc = tierConfig[tier];
          const count = memories[tier]?.length || 0;
          const isActive = activeTab === tier;

          return (
            <button
              key={tier}
              onClick={() => setActiveTab(tier)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? `${tc.bgColor} ${tc.color}`
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={tc.icon} />
              </svg>
              {tc.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? "bg-white" : "bg-gray-100"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tier description */}
      <div className={`p-3 rounded-lg ${config.bgColor} mb-4`}>
        <p className={`text-sm ${config.color}`}>{config.description}</p>
      </div>

      {/* Memory entries */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : currentMemories.length === 0 ? (
        <div className="text-center py-12">
          <svg className={`w-12 h-12 mx-auto mb-3 ${config.color} opacity-30`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={config.icon} />
          </svg>
          <p className="text-gray-500 text-sm">No memories in this tier yet.</p>
          <p className="text-gray-400 text-xs mt-1">The agent stores memories as it works.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {currentMemories.map((entry) => (
            <div key={entry.id} className="card-hover">
              {editingId === entry.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="input min-h-[60px]"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => handleUpdate(entry.id)} className="btn-primary text-sm">Save</button>
                    <button onClick={() => setEditingId(null)} className="btn-secondary text-sm">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{entry.content}</p>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>{new Date(entry.createdAt).toLocaleString()}</span>
                      {entry.relevanceScore > 0 && (
                        <span>Score: {entry.relevanceScore.toFixed(2)}</span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEdit(entry)}
                        className="p-1 text-gray-400 hover:text-primary-600 transition-colors"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
