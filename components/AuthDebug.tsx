import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useAuth } from "../hooks/useAuth";

export default function AuthDebug() {
  const { user, loading, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Auth Debug Info</Text>
      <Text style={styles.info}>Loading: {loading ? "Yes" : "No"}</Text>
      <Text style={styles.info}>User: {user ? user.email : "None"}</Text>
      <Text style={styles.info}>User ID: {user?.id || "None"}</Text>

      {user && (
        <TouchableOpacity style={styles.button} onPress={signOut}>
          <Text style={styles.buttonText}>Sign Out</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#f0f0f0",
    margin: 10,
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  info: {
    fontSize: 14,
    marginBottom: 5,
  },
  button: {
    backgroundColor: "#e74c3c",
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
});



