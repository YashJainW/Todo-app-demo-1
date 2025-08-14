import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.name || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const isDirty = useMemo(() => {
    return (
      (user?.name || "") !== firstName.trim() ||
      (user?.email || "") !== email.trim() ||
      newPassword.trim().length > 0 ||
      currentPassword.trim().length > 0
    );
  }, [firstName, email, newPassword, currentPassword, user]);

  const handleUpdate = async () => {
    if (!supabase) return;
    if (!isDirty) return;
    try {
      setLoading(true);
      // Update name
      if ((user?.name || "") !== firstName.trim()) {
        if (!supabase) return;
        const { error } = await supabase.auth.updateUser({
          data: { first_name: firstName.trim() },
        });
        if (error) throw error;
      }
      // Update email
      if ((user?.email || "") !== email.trim()) {
        if (!supabase) return;
        const { error } = await supabase.auth.updateUser({
          email: email.trim(),
        });
        if (error) {
          if (
            typeof error.message === "string" &&
            /already registered|already exists|duplicate/i.test(error.message)
          ) {
            Alert.alert("Error", "This email is already in use");
            return;
          }
          throw error;
        }
        Alert.alert(
          "Email Update",
          "Check your inbox to confirm your new email."
        );
      }
      // Update password
      if (newPassword.trim().length > 0) {
        if (newPassword.trim().length < 6) {
          Alert.alert("Error", "Password must be at least 6 characters");
          return;
        }
        if (!currentPassword.trim()) {
          Alert.alert(
            "Error",
            "Current password is required to change password"
          );
          return;
        }

        // First verify current password by attempting to sign in
        if (!supabase) return;
        const { error: verifyError } = await supabase.auth.signInWithPassword({
          email: user?.email || "",
          password: currentPassword.trim(),
        });

        if (verifyError) {
          Alert.alert("Error", "Current password is incorrect");
          return;
        }

        // Now update the password
        const { error } = await supabase.auth.updateUser({
          password: newPassword.trim(),
        });
        if (error) throw error;

        // Clear password fields
        setNewPassword("");
        setCurrentPassword("");

        Alert.alert(
          "Success",
          "Password updated successfully. You can now login with your new password."
        );
      }

      if (
        (user?.name || "") !== firstName.trim() ||
        (user?.email || "") !== email.trim()
      ) {
        Alert.alert("Success", "Information updated");
      }
      setIsEditing(false);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to update information");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const sb = supabase;
    if (!sb || !user) return;
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This will remove all your tasks permanently.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const { error: taskErr } = await sb
                .from("tasks")
                .delete()
                .eq("user_id", user.id);
              if (taskErr) throw taskErr;

              const { error: delErr } = await sb.rpc(
                "delete_user_and_sessions",
                { p_user_id: user.id }
              );
              if (delErr) {
                console.warn(
                  "RPC delete_user_and_sessions not available:",
                  delErr
                );
              }

              await signOut();
            } catch (e: any) {
              Alert.alert("Error", e.message || "Failed to delete account");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>User Information</Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>First Name</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.readonly]}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Enter first name"
            editable={isEditing}
          />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.readonly]}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter email"
            editable={isEditing}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Current Password</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.readonly]}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder={
              isEditing ? "Enter current password" : "Tap Edit to change"
            }
            editable={isEditing}
            secureTextEntry
          />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>New Password</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.readonly]}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder={
              isEditing ? "Enter new password" : "Tap Edit to change"
            }
            editable={isEditing}
            secureTextEntry
          />
        </View>

        {!isEditing ? (
          <TouchableOpacity
            style={styles.button}
            onPress={() => setIsEditing(true)}
          >
            <Text style={styles.buttonText}>Edit Information</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.secondaryButton]}
              onPress={() => {
                setIsEditing(false);
                setFirstName(user?.name || "");
                setEmail(user?.email || "");
                setNewPassword("");
                setCurrentPassword("");
              }}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, !isDirty && styles.buttonDisabled]}
              disabled={!isDirty || loading}
              onPress={handleUpdate}
            >
              <Text style={styles.buttonText}>Update</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.cardDanger}>
        <TouchableOpacity
          style={[styles.deleteButton, loading && styles.buttonDisabled]}
          onPress={handleDeleteAccount}
          disabled={loading}
        >
          <Text style={styles.deleteButtonText}>Delete Account</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#f8f9fa",
  },
  header: {
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e8ed",
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2c3e50",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e1e8ed",
  },
  cardDanger: {
    backgroundColor: "#fff5f5",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#ffe3e3",
  },
  row: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: "#7f8c8d",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e1e8ed",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
  },
  readonly: {
    backgroundColor: "#f6f7f9",
    color: "#7f8c8d",
  },
  button: {
    backgroundColor: "#3498db",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
    minWidth: 120,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 8,
  },
  secondaryButton: {
    backgroundColor: "#ecf0f1",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: "#2c3e50",
    fontWeight: "600",
  },
  deleteButton: {
    backgroundColor: "#e74c3c",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  deleteButtonText: {
    color: "white",
    fontWeight: "700",
  },
});
