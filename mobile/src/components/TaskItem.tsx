import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import type { TaskItem as TaskItemType } from "../lib/types";

interface TaskItemProps {
  task: TaskItemType;
  onPress?: () => void;
}

const priorityColors: Record<string, string> = {
  critical: "#DC2626",
  high: "#EA580C",
  medium: "#CA8A04",
  low: "#16A34A",
};

const statusColors: Record<string, string> = {
  todo: "#6B7280",
  open: "#3B82F6",
  in_progress: "#8B5CF6",
  done: "#22C55E",
  blocked: "#EF4444",
};

const statusLabels: Record<string, string> = {
  todo: "To Do",
  open: "Open",
  in_progress: "In Progress",
  done: "Done",
  blocked: "Blocked",
};

export default function TaskItemComponent({ task, onPress }: TaskItemProps) {
  const priorityColor = priorityColors[task.priority] || "#6B7280";
  const statusColor = statusColors[task.status] || "#6B7280";
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.container, isOverdue && styles.overdueContainer]}>
        <View style={styles.header}>
          <View style={[styles.priorityBadge, { backgroundColor: priorityColor + "20" }]}>
            <Text style={[styles.priorityText, { color: priorityColor }]}>
              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusLabels[task.status] || task.status}
            </Text>
          </View>
        </View>

        <Text style={styles.title}>{task.title}</Text>

        {task.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {task.description}
          </Text>
        ) : null}

        <View style={styles.footer}>
          <View style={styles.assigneeContainer}>
            {task.assignee ? (
              <>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {task.assignee.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.assigneeName}>{task.assignee}</Text>
              </>
            ) : (
              <Text style={styles.unassigned}>Unassigned</Text>
            )}
          </View>

          {task.dueDate && (
            <Text style={[styles.dueDate, isOverdue && styles.overdueDateText]}>
              {isOverdue ? "Overdue: " : ""}
              {formatDate(task.dueDate)}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  overdueContainer: {
    borderColor: "#FCA5A5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: "600",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 8,
    lineHeight: 18,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  assigneeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4F46E5",
  },
  assigneeName: {
    fontSize: 12,
    color: "#4B5563",
  },
  unassigned: {
    fontSize: 12,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  dueDate: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  overdueDateText: {
    color: "#EF4444",
    fontWeight: "600",
  },
});
