"use client";

import { useEffect, useState, useCallback } from "react";
import { getReports, generateReport, deleteReport } from "@/lib/api";
import type { Report, ReportType } from "@/lib/types";

const reportTypeConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  daily: { label: "Daily", color: "text-blue-600", bgColor: "bg-blue-50" },
  weekly: { label: "Weekly", color: "text-purple-600", bgColor: "bg-purple-50" },
  standup: { label: "Standup", color: "text-orange-600", bgColor: "bg-orange-50" },
  sprint: { label: "Sprint", color: "text-green-600", bgColor: "bg-green-50" },
  status: { label: "Status", color: "text-gray-600", bgColor: "bg-gray-50" },
};

function renderMarkdown(content: string): string {
  let html = content;

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-lg font-medium mt-4 mb-2 text-gray-700">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mt-6 mb-3 text-gray-800">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mb-4 text-gray-900">$1</h1>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>');

  // Tables
  html = html.replace(/^\|(.+)\|$/gm, (match) => {
    const cells = match.split('|').filter(c => c.trim());
    if (cells.every(c => c.trim().match(/^[-]+$/))) {
      return '';
    }
    const isHeader = match.includes('---');
    const tag = isHeader ? 'th' : 'td';
    const cellsHtml = cells.map(c =>
      `<${tag} class="border border-gray-200 px-3 py-2 text-left text-sm">${c.trim()}</${tag}>`
    ).join('');
    return `<tr>${cellsHtml}</tr>`;
  });

  // Wrap table rows
  const tableMatch = html.match(/(<tr>.*<\/tr>\n?)+/gs);
  if (tableMatch) {
    tableMatch.forEach(table => {
      html = html.replace(table, `<table class="w-full border-collapse mb-4 text-sm">${table}</table>`);
    });
  }

  // Lists
  html = html.replace(/^- (.+)$/gm, '<li class="text-gray-600 text-sm ml-4">$1</li>');
  html = html.replace(/(<li.*<\/li>\n?)+/gs, (match) => `<ul class="list-disc mb-3 space-y-1">${match}</ul>`);

  // Paragraphs
  html = html.replace(/^(?!<[hultd]|<\/|$)(.+)$/gm, '<p class="text-sm text-gray-600 mb-2">$1</p>');

  return html;
}

export default function ReportViewer() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [selectedType, setSelectedType] = useState<ReportType>("status");

  const fetchReports = useCallback(async () => {
    try {
      const data = await getReports();
      setReports(data);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const report = await generateReport("proj-001", selectedType);
      setReports((prev) => [report, ...prev]);
      setSelectedReport(report);
    } catch (err) {
      console.error("Failed to generate report:", err);
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteReport(id);
      setReports((prev) => prev.filter((r) => r.id !== id));
      if (selectedReport?.id === id) setSelectedReport(null);
    } catch (err) {
      console.error("Failed to delete report:", err);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Reports</h2>
          <p className="text-sm text-gray-500">{reports.length} reports generated</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as ReportType)}
            className="input w-36"
          >
            <option value="status">Status</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="standup">Standup</option>
            <option value="sprint">Sprint</option>
          </select>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn-primary flex items-center gap-2"
          >
            {generating ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
            Generate Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Report list */}
        <div className="col-span-1 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12 card">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500 text-sm">No reports yet.</p>
              <p className="text-gray-400 text-xs mt-1">Generate one to get started.</p>
            </div>
          ) : (
            reports.map((report) => {
              const typeConf = reportTypeConfig[report.reportType] || reportTypeConfig.status;
              const isSelected = selectedReport?.id === report.id;

              return (
                <div
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className={`card cursor-pointer transition-all duration-200 ${
                    isSelected ? "ring-2 ring-primary-500 shadow-md" : "hover:shadow-md"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeConf.bgColor} ${typeConf.color}`}>
                      {typeConf.label}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(report.id); }}
                      className="p-1 text-gray-400 hover:text-red-500"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <h4 className="text-sm font-medium text-gray-900 mb-1">{report.title}</h4>
                  <p className="text-xs text-gray-400">
                    {new Date(report.generatedAt).toLocaleString()} by {report.generatedBy}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Report content */}
        <div className="col-span-2">
          {selectedReport ? (
            <div className="card">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedReport.title}</h3>
                  <p className="text-sm text-gray-500">
                    Generated {new Date(selectedReport.generatedAt).toLocaleString()}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  (reportTypeConfig[selectedReport.reportType] || reportTypeConfig.status).bgColor
                } ${
                  (reportTypeConfig[selectedReport.reportType] || reportTypeConfig.status).color
                }`}>
                  {(reportTypeConfig[selectedReport.reportType] || reportTypeConfig.status).label}
                </span>
              </div>

              <div
                className="report-content"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedReport.content) }}
              />
            </div>
          ) : (
            <div className="card text-center py-16">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500">Select a report to view its contents</p>
              <p className="text-gray-400 text-sm mt-1">Or generate a new one using the button above</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
