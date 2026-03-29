import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from "react-native";
import { getTasks, updateTaskStatus } from "../lib/api";
import type { TaskItem as TaskItemType } from "../lib/types";
import TaskItemComponent from "../components/TaskItem";

const statusFilters = [
  { key: "all", label: "All" },
  { key: "todo", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "done", label: "Done" },
  { key: "blocked", label: "Blocked" },
];

export default function TaskFeedScreen() {
  const [tasks, setTasks] = useState<TaskItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");

  const fetchTasks = useCallback(async () => {
    try {
      const data = await getTasks();
      setTasks(data);
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

  const handleTaskPress = (task: TaskItemType) => {
    const nextStatuses: Record<string, string> = {
      todo: "in_progress",
      open: "in_progress",
      in_progress: "done",
      blocked: "in_progress",
    };

    const next = nextStatuses[task.status];
    if (!next || task.status === "done") {
      Alert.alert("Task Details", `${task.title}\n\n${task.description}\n\nStatus: ${task.status}\nPriority: ${task.priority}\nAssignee: ${task.assignee || "Unassigned"}`);
      return;
    }

    Alert.alert(
      "Update Status",
      `Move "${task.title}" to ${next.replace("_", " ")}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Update",
          onPress: async () => {
            try {
              await updateTaskStatus(task.id, next);
              fetchTasks();
            } catch (err) {
              Alert.alert("Error", "Failed to update task status");
            }
          },
        },
      ]
    );
  };

  const filteredTasks = filter === "all"
    ? tasks
    : tasks.filter((t) => {
        if (filter === "todo") return t.status === "todo" || t.status === "open";
        return t.status === filter;
      });

  return (
    <View style={styles.container}>
      {/* Filter tabs */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={statusFilters}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setFilter(item.key)}
              style={[
                styles.filterButton,
                filter === item.key && styles.filterButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === item.key && styles.filterTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Task count */}
      <View style={styles.countContainer}>
        <Text style={styles.countText}>
          {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {/* Task list */}
      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TaskItemComponent task={item} onPress={() => handleTaskPress(item)} />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No tasks found</Text>
            <Text style={styles.emptySubtitle}>Pull to refresh or change the filter</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  filterContainer: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  filterList: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
  },
  filterButtonActive: {
    backgroundColor: "#4F46E5",
  },
  filterText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  filterTextActive: {
    color: "#FFFFFF",
  },
  countContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  countText: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#9CA3AF",
  },
});
