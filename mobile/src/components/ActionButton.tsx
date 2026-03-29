import React from "react";
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from "react-native";

interface ActionButtonProps {
  label: string;
  description?: string;
  onPress: () => void;
  loading?: boolean;
  color?: string;
  icon?: string;
}

export default function ActionButton({
  label,
  description,
  onPress,
  loading = false,
  color = "#4F46E5",
}: ActionButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.7}
      style={[styles.container, { borderLeftColor: color }]}
    >
      <View style={styles.content}>
        <Text style={styles.label}>{label}</Text>
        {description && <Text style={styles.description}>{description}</Text>}
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <View style={[styles.arrow, { backgroundColor: color + "15" }]}>
          <Text style={[styles.arrowText, { color }]}>&#x25B6;</Text>
        </View>
      )}
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderLeftWidth: 4,
  },
  content: {
    flex: 1,
    marginRight: 12,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 16,
  },
  arrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  arrowText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
