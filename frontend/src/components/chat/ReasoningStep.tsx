"use client";

import type { AgentStep } from "@/lib/types";

interface ReasoningStepProps {
  step: AgentStep;
}

const phaseConfig = {
  thought: { label: "Thinking", color: "border-amber-400 bg-amber-50", icon: "text-amber-600", dotColor: "bg-amber-400" },
  plan: { label: "Planning", color: "border-violet-400 bg-violet-50", icon: "text-violet-600", dotColor: "bg-violet-400" },
  action: { label: "Acting", color: "border-blue-400 bg-blue-50", icon: "text-blue-600", dotColor: "bg-blue-400" },
  observation: { label: "Observing", color: "border-emerald-400 bg-emerald-50", icon: "text-emerald-600", dotColor: "bg-emerald-400" },
};

export default function ReasoningStep({ step }: ReasoningStepProps) {
  return (
    <div className="space-y-3">
      {/* Thought */}
      <div className={`border-l-4 rounded-r-lg p-4 ${phaseConfig.thought.color}`}>
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-2 h-2 rounded-full ${phaseConfig.thought.dotColor}`} />
          <span className={`text-sm font-semibold ${phaseConfig.thought.icon}`}>
            Thinking (Step {step.iteration + 1})
          </span>
        </div>
        <p className="text-sm text-gray-700">{step.thought.reasoning}</p>
      </div>

      {/* Plan */}
      <div className={`border-l-4 rounded-r-lg p-4 ${phaseConfig.plan.color}`}>
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-2 h-2 rounded-full ${phaseConfig.plan.dotColor}`} />
          <span className={`text-sm font-semibold ${phaseConfig.plan.icon}`}>
            Planning: {step.plan.goal}
          </span>
        </div>
        <ol className="list-decimal list-inside space-y-1">
          {step.plan.steps.map((s, i) => (
            <li key={i} className="text-sm text-gray-600">{s}</li>
          ))}
        </ol>
      </div>

      {/* Actions */}
      {step.actions.map((action, i) => (
        <div key={i} className={`border-l-4 rounded-r-lg p-4 ${phaseConfig.action.color}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${phaseConfig.action.dotColor}`} />
            <span className={`text-sm font-semibold ${phaseConfig.action.icon}`}>
              Tool: {action.tool_name}
            </span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${action.success ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {action.success ? "Success" : "Failed"}
            </span>
          </div>
          <div className="text-xs text-gray-500 font-mono bg-white bg-opacity-60 p-2 rounded">
            {JSON.stringify(action.arguments, null, 2).slice(0, 200)}
          </div>
          {action.error && (
            <p className="text-sm text-red-600 mt-1">{action.error}</p>
          )}
        </div>
      ))}

      {/* Observation */}
      <div className={`border-l-4 rounded-r-lg p-4 ${phaseConfig.observation.color}`}>
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-2 h-2 rounded-full ${phaseConfig.observation.dotColor}`} />
          <span className={`text-sm font-semibold ${phaseConfig.observation.icon}`}>
            Observation
          </span>
          {step.is_final && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium">
              Goal Achieved
            </span>
          )}
        </div>
        <p className="text-sm text-gray-700">{step.observation.content}</p>
      </div>
    </div>
  );
}
