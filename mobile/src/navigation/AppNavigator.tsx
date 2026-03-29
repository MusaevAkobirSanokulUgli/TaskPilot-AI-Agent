import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text, View, StyleSheet } from "react-native";

import TaskFeedScreen from "../screens/TaskFeed";
import AgentChatScreen from "../screens/AgentChat";
import NotificationsScreen from "../screens/Notifications";
import QuickActionsScreen from "../screens/QuickActions";

const Tab = createBottomTabNavigator();

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Tasks: "\u2630",
    Chat: "\u2709",
    Notifications: "\u2706",
    Actions: "\u26A1",
  };

  return (
    <View style={styles.iconContainer}>
      <Text style={[styles.icon, focused && styles.iconActive]}>
        {icons[name] || "\u2022"}
      </Text>
    </View>
  );
}

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
        tabBarActiveTintColor: "#4F46E5",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "#F3F4F6",
          paddingBottom: 4,
          height: 56,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
        headerStyle: {
          backgroundColor: "#FFFFFF",
          shadowColor: "transparent",
          borderBottomWidth: 1,
          borderBottomColor: "#F3F4F6",
        },
        headerTitleStyle: {
          fontSize: 17,
          fontWeight: "700",
          color: "#111827",
        },
      })}
    >
      <Tab.Screen
        name="Tasks"
        component={TaskFeedScreen}
        options={{ headerTitle: "Task Feed" }}
      />
      <Tab.Screen
        name="Chat"
        component={AgentChatScreen}
        options={{ headerTitle: "Agent Chat" }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ headerTitle: "Notifications" }}
      />
      <Tab.Screen
        name="Actions"
        component={QuickActionsScreen}
        options={{ headerTitle: "Quick Actions" }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  icon: {
    fontSize: 20,
    color: "#9CA3AF",
  },
  iconActive: {
    color: "#4F46E5",
  },
});
