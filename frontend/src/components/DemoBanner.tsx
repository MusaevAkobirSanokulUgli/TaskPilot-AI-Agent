"use client";

import { isDemoMode } from "@/lib/api";

export default function DemoBanner() {
  if (!isDemoMode()) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-sm text-amber-800">
      <strong>Demo Mode</strong> — Backend not connected. Showing sample data.{" "}
      <a
        href="https://github.com/MusaevAkobirSanokulUgli/TaskPilot-AI-Agent#quick-start"
        target="_blank"
        rel="noopener noreferrer"
        className="underline font-medium hover:text-amber-900"
      >
        Run with Docker Compose
      </a>{" "}
      for full AI agent functionality.
    </div>
  );
}
