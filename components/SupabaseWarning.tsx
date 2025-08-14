import React from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function SupabaseWarning() {
  const showSetupInstructions = () => {
    Alert.alert(
      "Supabase Setup Required",
      "To use this app, you need to configure Supabase:\n\n" +
        "1. Copy env.template to .env\n" +
        "2. Add your Supabase credentials\n" +
        "3. Restart the app\n\n" +
        "See README.md for detailed instructions.",
      [
        { text: "OK", style: "default" },
        { text: "View README", onPress: () => console.log("Show README") },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Ionicons name="warning" size={48} color="#f39c12" />
      <Text style={styles.title}>Supabase Not Configured</Text>
      <Text style={styles.message}>
        This app requires Supabase credentials to function properly.
      </Text>
      <Text style={styles.instruction} onPress={showSetupInstructions}>
        Tap here for setup instructions
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f8f9fa",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2c3e50",
    marginTop: 20,
    marginBottom: 10,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    color: "#7f8c8d",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 24,
  },
  instruction: {
    fontSize: 16,
    color: "#3498db",
    textDecorationLine: "underline",
    textAlign: "center",
  },
});
