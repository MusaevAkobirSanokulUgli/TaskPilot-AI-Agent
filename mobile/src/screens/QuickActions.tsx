import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { runAgent } from "../lib/api";
import ActionButton from "../components/ActionButton";

interface QuickAction {
  label: string;
  description: string;
  instruction: string;
  color: string;
}

const quickActions: QuickAction[] = [
  {
    label: "Triage Bugs",
    description: "Analyze all open bugs and assign priority levels",
    instruction: "Triage all open bugs and assign priorities",
    color: "#EF4444",
  },
  {
    label: "Generate Weekly Report",
    description: "Create a comprehensive weekly status report",
    instruction: "Generate a weekly status report",
    color: "#8B5CF6",
  },
  {
    label: "Daily Standup Summary",
    description: "Summarize today's progress, blockers, and plan",
    instruction: "Generate daily standup summary",
    color: "#F59E0B",
  },
  {
    label: "Assign Tasks",
    description: "Smart-assign unassigned tasks to team members",
    instruction: "Assign all unassigned tasks to team members based on workload",
    color: "#3B82F6",
  },
  {
    label: "Code Analysis",
    description: "Analyze the codebase for issues and improvements",
    instruction: "Analyze code and find potential issues",
    color: "#10B981",
  },
  {
    label: "Generate Status Report",
    description: "Quick overview of project health and metrics",
    instruction: "Generate a project status report",
    color: "#6366F1",
  },
  {
    label: "Check Blocked Tasks",
    description: "Review and suggest solutions for blocked items",
    instruction: "Review all blocked tasks and suggest how to unblock them",
    color: "#EC4899",
  },
  {
    label: "Sprint Review",
    description: "Generate sprint metrics and completion analysis",
    instruction: "Generate a sprint review report",
    color: "#14B8A6",
  },
];

export default function QuickActionsScreen() {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const handleAction = async (action: QuickAction) => {
    setLoadingAction(action.label);
    setLastResult(null);

    try {
      const session = await runAgent(action.instruction);

      if (session.state === "completed") {
        const lastStep = session.steps?.[session.steps.length - 1];
        const observation = lastStep?.observation?.content || "Task completed successfully.";

        setLastResult(`${action.label}: ${observation.slice(0, 150)}`);

        Alert.alert(
          "Action Completed",
          `${action.label} completed in ${session.total_steps} step(s).\n\n${observation.slice(0, 200)}`,
          [{ text: "OK" }]
        );
      } else {
        setLastResult(`${action.label}: ${session.error || session.state}`);
        Alert.alert("Action Status", `Session ended with state: ${session.state}. ${session.error || ""}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to reach agent";
      setLastResult(`Error: ${message}`);
      Alert.alert(
        "Error",
        `Could not complete action: ${message}\n\nMake sure the agent core is running.`
      );
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Quick Actions</Text>
        <Text style={styles.subtitle}>
          Tap an action to run the AI agent. Each action triggers a full ReAct
          reasoning cycle.
        </Text>
      </View>

      {/* Last result */}
      {lastResult && (
        <View style={[styles.resultContainer, lastResult.startsWith("Error") ? styles.errorResult : styles.successResult]}>
          <Text style={styles.resultText}>{lastResult}</Text>
        </View>
      )}

      {/* Actions */}
      {quickActions.map((action) => (
        <ActionButton
          key={action.label}
          label={action.label}
          description={action.description}
          onPress={() => handleAction(action)}
          loading={loadingAction === action.label}
          color={action.color}
        />
      ))}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Actions are powered by the TaskPilot ReAct agent engine.
          Each action involves reasoning, planning, tool execution, and observation.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  content: {
    paddingBottom: 32,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  resultContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
  },
  successResult: {
    backgroundColor: "#F0FDF4",
  },
  errorResult: {
    backgroundColor: "#FEF2F2",
  },
  resultText: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  footerText: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 18,
  },
});
