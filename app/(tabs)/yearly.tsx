import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useAuth } from "../../hooks/useAuth";
import { supabase, Task } from "../../lib/supabase";
import {
  toggleTaskAndSync,
  loadChildrenProgress,
  deleteTaskTree,
  deleteTaskKeepChildrenOrReparent,
} from "../../lib/taskActions";
import i18n from "../../constants/i18n";
import { fonts } from "../../lib/fonts";

export default function YearlyScreen() {
  const { user } = useAuth();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [childrenProgress, setChildrenProgress] = useState<
    Record<string, { total: number; completed: number }>
  >({});

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user, selectedYear]);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchTasks();
      }
    }, [user, selectedYear])
  );

  const fetchTasks = async () => {
    if (!user) return;

    try {
      setLoading(true);

      if (!supabase) return;
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "Yearly")
        .eq("timeframe->>year", selectedYear)
        .order("priority", { ascending: false });

      if (error) throw error;
      const list = data || [];
      setTasks(list);
      const progress = await loadChildrenProgress(list.map((t) => t.id));
      setChildrenProgress(progress);
    } catch (error) {
      console.error("Error fetching yearly tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTasks();
    setRefreshing(false);
  };

  const changeYear = (direction: "prev" | "next") => {
    if (direction === "prev") {
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedYear(selectedYear + 1);
    }
  };

  const toggleTaskCompletion = async (task: Task) => {
    try {
      const newStatus = !task.is_completed;
      await toggleTaskAndSync(task, newStatus);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, is_completed: newStatus } : t
        )
      );
      const progress = await loadChildrenProgress(tasks.map((t) => t.id));
      setChildrenProgress(progress);
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const renderTaskItem = (task: Task) => (
    <TouchableOpacity
      key={task.id}
      style={[styles.taskItem, task.is_completed && styles.completedTask]}
      onPress={() => toggleTaskCompletion(task)}
    >
      <View style={styles.taskContent}>
        <TouchableOpacity
          style={[styles.checkbox, task.is_completed && styles.checkedCheckbox]}
          onPress={() => toggleTaskCompletion(task)}
        >
          {task.is_completed && (
            <Ionicons name="checkmark" size={16} color="white" />
          )}
        </TouchableOpacity>
        <View style={styles.taskText}>
          <Text
            style={[
              styles.taskName,
              task.is_completed && styles.completedTaskText,
            ]}
          >
            {task.name}
          </Text>
          {task.description && (
            <Text style={styles.taskDescription}>{task.description}</Text>
          )}
          {childrenProgress[task.id] && childrenProgress[task.id].total > 0 && (
            <Text style={styles.progressText}>
              {childrenProgress[task.id].completed > 0 &&
              childrenProgress[task.id].completed <
                childrenProgress[task.id].total
                ? `In progress (${childrenProgress[task.id].completed}/${
                    childrenProgress[task.id].total
                  })`
                : childrenProgress[task.id].completed ===
                  childrenProgress[task.id].total
                ? "Completed"
                : "Not started"}
            </Text>
          )}
          {task.timeframe.year && (
            <Text style={styles.taskDate}>{task.timeframe.year}</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => router.push(`/add-edit-task?id=${task.id}`)}
        >
          <Ionicons name="create-outline" size={20} color="#3498db" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => onDeleteTask(task)}
        >
          <Ionicons name="trash" size={20} color="#e74c3c" />
        </TouchableOpacity>
        <View
          style={[
            styles.priorityBadge,
            task.priority === 1 && styles.priority1,
            task.priority === 2 && styles.priority2,
            task.priority === 3 && styles.priority3,
            task.priority === 4 && styles.priority4,
            task.priority === 5 && styles.priority5,
          ]}
        >
          <Text style={styles.priorityText}>{task.priority}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const onDeleteTask = (task: Task) => {
    Alert.alert(
      "Delete Task",
      "What would you like to do with its children (if any)?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Task Only",
          onPress: async () => {
            try {
              await deleteTaskKeepChildrenOrReparent(task.id);
              setTasks((prev) => prev.filter((t) => t.id !== task.id));
            } catch (e) {
              console.error("Error deleting task:", e);
            }
          },
        },
        {
          text: "Delete Task + Children",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteTaskTree(task.id);
              setTasks((prev) => prev.filter((t) => t.id !== task.id));
            } catch (e) {
              console.error("Error deleting task:", e);
            }
          },
        },
      ]
    );
  };

  const formatYear = (year: number) => {
    const currentYear = new Date().getFullYear();

    if (year === currentYear) {
      return "This Year";
    } else if (year < currentYear) {
      return "Previous Year";
    } else {
      return "Next Year";
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.yearButton}
          onPress={() => changeYear("prev")}
        >
          <Ionicons name="chevron-back" size={24} color="#3498db" />
        </TouchableOpacity>

        <View style={styles.yearContainer}>
          <Text style={styles.yearText}>{formatYear(selectedYear)}</Text>
          <Text style={styles.yearNumber}>{selectedYear}</Text>
        </View>

        <TouchableOpacity
          style={styles.yearButton}
          onPress={() => changeYear("next")}
        >
          <Ionicons name="chevron-forward" size={24} color="#3498db" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() =>
          router.push({
            pathname: "/add-edit-task",
            params: { type: "Yearly" },
          })
        }
      >
        <Ionicons name="add" size={24} color="white" />
        <Text style={styles.addButtonText}>{i18n.t("tasks.addTask")}</Text>
      </TouchableOpacity>

      <View style={styles.tasksContainer}>
        <Text style={styles.sectionTitle}>
          {tasks.length > 0
            ? `${tasks.length} Yearly Goal${tasks.length !== 1 ? "s" : ""}`
            : "No Yearly Goals"}
        </Text>

        {tasks.length > 0 ? (
          tasks.map(renderTaskItem)
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-number" size={64} color="#bdc3c7" />
            <Text style={styles.emptyText}>{i18n.t("tasks.noTasks")}</Text>
            <Text style={styles.emptySubtext}>
              Add a yearly goal for {formatYear(selectedYear).toLowerCase()} to
              get started
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  yearButton: {
    padding: 8,
  },
  yearContainer: {
    alignItems: "center",
  },
  yearText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 2,
    fontFamily: fonts.quicksand.bold,
  },
  yearNumber: {
    fontSize: 24,
    color: "#3498db",
    fontWeight: "bold",
    fontFamily: fonts.quicksand.bold,
  },
  addButton: {
    backgroundColor: "#3498db",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
    fontFamily: fonts.quicksand.semiBold,
  },
  tasksContainer: {
    backgroundColor: "white",
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 16,
    fontFamily: fonts.quicksand.semiBold,
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f4",
  },
  completedTask: {
    opacity: 0.6,
  },
  taskContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#3498db",
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  checkedCheckbox: {
    backgroundColor: "#3498db",
  },
  taskText: {
    flex: 1,
  },
  taskName: {
    fontSize: 16,
    color: "#2c3e50",
    fontWeight: "500",
    fontFamily: fonts.quicksand.medium,
  },
  completedTaskText: {
    textDecorationLine: "line-through",
    color: "#7f8c8d",
  },
  taskDescription: {
    fontSize: 14,
    color: "#7f8c8d",
    marginTop: 4,
    fontFamily: fonts.quicksand.regular,
  },
  progressText: {
    fontSize: 12,
    color: "#7f8c8d",
    marginTop: 2,
    fontFamily: fonts.quicksand.regular,
  },
  taskDate: {
    fontSize: 12,
    color: "#7f8c8d",
    marginTop: 4,
    fontFamily: fonts.quicksand.regular,
  },
  priorityBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  editButton: {
    marginLeft: 8,
    padding: 6,
  },
  deleteButton: {
    marginLeft: 4,
    padding: 6,
  },
  priority1: { backgroundColor: "#e8f5e8" },
  priority2: { backgroundColor: "#fff3cd" },
  priority3: { backgroundColor: "#ffeaa7" },
  priority4: { backgroundColor: "#ff7675" },
  priority5: { backgroundColor: "#d63031" },
  priorityText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#2c3e50",
    fontFamily: fonts.quicksand.bold,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    color: "#7f8c8d",
    marginTop: 16,
    fontWeight: "500",
    fontFamily: fonts.quicksand.medium,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#bdc3c7",
    marginTop: 8,
    textAlign: "center",
    fontFamily: fonts.quicksand.regular,
  },
});
