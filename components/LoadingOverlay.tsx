import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "../lib/fonts";

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  size?: "small" | "large";
}

export default function LoadingOverlay({
  visible,
  message = "Loading...",
  size = "large",
}: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.loadingCard}>
        <ActivityIndicator
          size={size === "large" ? "large" : "small"}
          color="#3498db"
          style={styles.spinner}
        />
        <Text style={styles.loadingText}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  loadingCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    minWidth: 140,
    minHeight: 140,
  },
  spinner: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    color: "#2c3e50",
    fontFamily: fonts.quicksand.medium,
    textAlign: "center",
  },
});
