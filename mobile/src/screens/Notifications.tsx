import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
} from "react-native";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  timestamp: Date;
  read: boolean;
}

const mockNotifications: Notification[] = [
  {
    id: "1",
    title: "Bug Triage Completed",
    message: "Agent triaged 3 open bugs. 1 critical, 1 high, 1 medium priority assigned.",
    type: "success",
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    read: false,
  },
  {
    id: "2",
    title: "Task Assigned",
    message: 'Alice has been assigned "Fix login crash on iOS" (Critical priority)',
    type: "info",
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    read: false,
  },
  {
    id: "3",
    title: "Weekly Report Generated",
    message: "Weekly status report for TaskPilot Demo Project is ready. Completion rate: 12.5%",
    type: "info",
    timestamp: new Date(Date.now() - 1000 * 60 * 60),
    read: true,
  },
  {
    id: "4",
    title: "Overdue Task Alert",
    message: '"Database connection timeout in production" is past its due date and still open.',
    type: "warning",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    read: true,
  },
  {
    id: "5",
    title: "Agent Session Error",
    message: "Agent encountered an error while analyzing code. Session was stopped.",
    type: "error",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
    read: true,
  },
  {
    id: "6",
    title: "New Task Created",
    message: 'Agent created task: "Investigate memory leak in dashboard component"',
    type: "info",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8),
    read: true,
  },
];

const typeConfig = {
  info: { color: "#3B82F6", bg: "#EFF6FF", icon: "i" },
  success: { color: "#22C55E", bg: "#F0FDF4", icon: "\u2713" },
  warning: { color: "#F59E0B", bg: "#FFFBEB", icon: "!" },
  error: { color: "#EF4444", bg: "#FEF2F2", icon: "\u00D7" },
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const formatTime = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    const config = typeConfig[item.type];
    return (
      <View style={[styles.notifCard, !item.read && styles.unreadCard]}>
        <View style={[styles.iconContainer, { backgroundColor: config.bg }]}>
          <Text style={[styles.iconText, { color: config.color }]}>{config.icon}</Text>
        </View>
        <View style={styles.notifContent}>
          <View style={styles.notifHeader}>
            <Text style={[styles.notifTitle, !item.read && styles.unreadTitle]}>
              {item.title}
            </Text>
            {!item.read && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.notifMessage} numberOfLines={2}>
            {item.message}
          </Text>
          <Text style={styles.notifTime}>{formatTime(item.timestamp)}</Text>
        </View>
      </View>
    );
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <View style={styles.container}>
      {/* Header info */}
      <View style={styles.headerInfo}>
        <Text style={styles.headerText}>
          {unreadCount > 0
            ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
            : "All caught up"}
        </Text>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No notifications yet</Text>
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
  headerInfo: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerText: {
    fontSize: 13,
    color: "#6B7280",
  },
  listContent: {
    paddingVertical: 8,
  },
  notifCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  unreadCard: {
    borderColor: "#C7D2FE",
    backgroundColor: "#FAFBFF",
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  iconText: {
    fontSize: 16,
    fontWeight: "700",
  },
  notifContent: {
    flex: 1,
  },
  notifHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    flex: 1,
  },
  unreadTitle: {
    fontWeight: "700",
    color: "#111827",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4F46E5",
  },
  notifMessage: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
    marginBottom: 4,
  },
  notifTime: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 14,
    color: "#9CA3AF",
  },
});
