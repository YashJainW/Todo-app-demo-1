import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useAuth } from "../../hooks/useAuth";
import { supabase, Task } from "../../lib/supabase";
import {
  deleteTaskTree,
  deleteTaskKeepChildrenOrReparent,
} from "../../lib/taskActions";
import { toggleTaskAndSync } from "../../lib/taskActions";
import i18n from "../../constants/i18n";
import { fonts } from "../../lib/fonts";

export default function HomeScreen() {
  const { user } = useAuth();
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [upcomingDailyTasks, setUpcomingDailyTasks] = useState<Task[]>([]);
  const [upcomingWeeklyTasks, setUpcomingWeeklyTasks] = useState<Task[]>([]);
  const [upcomingMonthlyTasks, setUpcomingMonthlyTasks] = useState<Task[]>([]);
  const [upcomingTab, setUpcomingTab] = useState<
    "Daily" | "Weekly" | "Monthly"
  >("Daily");
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchTasks();
      }
    }, [user])
  );

  const fetchTasks = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const today = new Date().toISOString().split("T")[0];

      // Fetch today's tasks
      if (!supabase) return;
      const { data: todayData } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "Daily")
        .eq("timeframe->>date", today)
        .order("priority", { ascending: false });

      // Upcoming Daily: include today and next day
      const nextDay = new Date();
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = nextDay.toISOString().split("T")[0];
      const { data: upcomingDaily } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "Daily")
        .gte("timeframe->>date", today)
        .lte("timeframe->>date", nextDayStr)
        .order("priority", { ascending: false });

      // Upcoming Weekly: next week (Mon-Sun)
      const computeNextWeekRange = () => {
        const now = new Date();
        const mondayOffset = (now.getDay() + 6) % 7; // 0=Mon..6=Sun
        const thisMonday = new Date(now);
        thisMonday.setHours(12, 0, 0, 0);
        thisMonday.setDate(thisMonday.getDate() - mondayOffset);
        const nextMonday = new Date(thisMonday);
        nextMonday.setDate(thisMonday.getDate() + 7);
        const nextSunday = new Date(nextMonday);
        nextSunday.setDate(nextMonday.getDate() + 6);
        const fmt = (d: Date) =>
          new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
            .toISOString()
            .split("T")[0];
        return { start: fmt(nextMonday), end: fmt(nextSunday) };
      };
      const { start: nextMonStr, end: nextSunStr } = computeNextWeekRange();
      // Compute current week range (Mon-Sun)
      const mondayOffsetCurr = (new Date().getDay() + 6) % 7;
      const currMon = new Date();
      currMon.setHours(12, 0, 0, 0);
      currMon.setDate(currMon.getDate() - mondayOffsetCurr);
      const currSun = new Date(currMon);
      currSun.setDate(currMon.getDate() + 6);
      const fmt = (d: Date) =>
        new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
          .toISOString()
          .split("T")[0];
      const currMonStr = fmt(currMon);
      const currSunStr = fmt(currSun);
      // Fetch both current and next week weekly tasks
      const { data: upcomingWeeklyCurr } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "Weekly")
        .eq("timeframe->>startDate", currMonStr)
        .eq("timeframe->>endDate", currSunStr)
        .order("priority", { ascending: false });
      const { data: upcomingWeeklyNext } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "Weekly")
        .eq("timeframe->>startDate", nextMonStr)
        .eq("timeframe->>endDate", nextSunStr)
        .order("priority", { ascending: false });
      const upcomingWeekly = [
        ...(upcomingWeeklyCurr || []),
        ...(upcomingWeeklyNext || []),
      ].filter((t, idx, arr) => arr.findIndex((x) => x.id === t.id) === idx);

      // Upcoming Monthly: include current month and next month
      const nextMonthDate = new Date();
      nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
      const nextMonth = nextMonthDate.getMonth() + 1;
      const nextYear = nextMonthDate.getFullYear();
      const currMonthDate = new Date();
      const currMonth = currMonthDate.getMonth() + 1;
      const currYear = currMonthDate.getFullYear();
      const { data: upcomingMonthlyCurr } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "Monthly")
        .eq("timeframe->>month", currMonth)
        .eq("timeframe->>year", currYear)
        .order("priority", { ascending: false });
      const { data: upcomingMonthlyNext } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "Monthly")
        .eq("timeframe->>month", nextMonth)
        .eq("timeframe->>year", nextYear)
        .order("priority", { ascending: false });
      const upcomingMonthly = [
        ...(upcomingMonthlyCurr || []),
        ...(upcomingMonthlyNext || []),
      ].filter((t, idx, arr) => arr.findIndex((x) => x.id === t.id) === idx);

      // Fetch overdue tasks
      const { data: overdueData } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "Daily")
        .lt("timeframe->>date", today)
        .order("timeframe->>date", { ascending: true });

      setTodayTasks(todayData || []);
      setUpcomingDailyTasks(upcomingDaily || []);
      setUpcomingWeeklyTasks(upcomingWeekly || []);
      setUpcomingMonthlyTasks(upcomingMonthly || []);
      setOverdueTasks(overdueData || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTasks();
    setRefreshing(false);
  };

  const handleClearAllTasks = async () => {
    if (!user || !supabase) return;
    Alert.alert(
      "Clear All Tasks",
      "Are you sure you want to delete all your tasks? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete All",
          style: "destructive",
          onPress: async () => {
            try {
              const sb = supabase;
              if (!sb) return;
              await sb.from("tasks").delete().eq("user_id", user.id);
              await fetchTasks();
            } catch (e) {
              console.error("Error clearing tasks:", e);
            }
          },
        },
      ]
    );
  };

  const toggleTaskCompletion = async (task: Task) => {
    try {
      const newStatus = !task.is_completed;
      await toggleTaskAndSync(task, newStatus);
      await fetchTasks();
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const renderTaskItem = (task: Task, showDate = false) => (
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
          {showDate && task.timeframe.date && (
            <Text style={styles.taskDate}>{task.timeframe.date}</Text>
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
    setTaskToDelete(task);
    setShowDeleteModal(true);
  };

  const renderSection = (
    title: string,
    tasks: Task[],
    emptyMessage: string,
    showDate = false
  ) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {tasks.length > 0 ? (
        tasks.map((task) => renderTaskItem(task, showDate))
      ) : (
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => router.push("/profile")}
              style={styles.headerNameWrapper}
            >
              <Text style={styles.welcomeText}>
                Welcome back, {user?.name?.trim() || user?.email?.split("@")[0]}
                !
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/profile")}>
              <Ionicons
                name="person-circle-outline"
                size={30}
                color="#34495e"
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push("/add-edit-task")}
        >
          <Ionicons name="add" size={24} color="white" />
          <Text style={styles.addButtonText}>{i18n.t("tasks.addTask")}</Text>
        </TouchableOpacity>

        {renderSection(
          i18n.t("home.today"),
          todayTasks,
          i18n.t("tasks.noTasks"),
          false
        )}

        {overdueTasks.length > 0 &&
          renderSection(i18n.t("home.overdue"), overdueTasks, "", true)}

        <View style={styles.upcomingCard}>
          <Text style={styles.sectionTitle}>{i18n.t("home.upcoming")}</Text>
          <View style={styles.upcomingTabs}>
            {(["Daily", "Weekly", "Monthly"] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.upcomingTab,
                  upcomingTab === tab && styles.upcomingTabActive,
                ]}
                onPress={() => setUpcomingTab(tab)}
              >
                <Text
                  style={[
                    styles.upcomingTabText,
                    upcomingTab === tab && styles.upcomingTabTextActive,
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {upcomingTab === "Daily" &&
            (upcomingDailyTasks.length > 0 ? (
              upcomingDailyTasks.map((t) => renderTaskItem(t, true))
            ) : (
              <Text style={styles.emptyText}>{i18n.t("tasks.noTasks")}</Text>
            ))}
          {upcomingTab === "Weekly" &&
            (upcomingWeeklyTasks.length > 0 ? (
              upcomingWeeklyTasks.map((t) => renderTaskItem(t, true))
            ) : (
              <Text style={styles.emptyText}>{i18n.t("tasks.noTasks")}</Text>
            ))}
          {upcomingTab === "Monthly" &&
            (upcomingMonthlyTasks.length > 0 ? (
              upcomingMonthlyTasks.map((t) => renderTaskItem(t, true))
            ) : (
              <Text style={styles.emptyText}>{i18n.t("tasks.noTasks")}</Text>
            ))}
        </View>
        <TouchableOpacity
          style={styles.clearAllButton}
          onPress={handleClearAllTasks}
        >
          <Ionicons name="trash" size={20} color="#fff" />
          <Text style={styles.clearAllButtonText}>Clear All Tasks</Text>
        </TouchableOpacity>
      </ScrollView>
      {/* Delete/Reparent Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Task</Text>
            <Text style={styles.modalBodyText}>
              What should happen to its children (if any)?
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={async () => {
                  if (!taskToDelete) return;
                  try {
                    await deleteTaskKeepChildrenOrReparent(taskToDelete.id);
                    await fetchTasks();
                  } catch (e) {
                    console.error("Error deleting task:", e);
                  } finally {
                    setShowDeleteModal(false);
                    setTaskToDelete(null);
                  }
                }}
              >
                <Text style={styles.modalButtonPrimaryText}>
                  Reparent children & Delete
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonDanger]}
                onPress={async () => {
                  if (!taskToDelete) return;
                  try {
                    await deleteTaskTree(taskToDelete.id);
                    await fetchTasks();
                  } catch (e) {
                    console.error("Error deleting task:", e);
                  } finally {
                    setShowDeleteModal(false);
                    setTaskToDelete(null);
                  }
                }}
              >
                <Text style={styles.modalButtonDangerText}>
                  Delete task + children
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalHint}>
              Children will be reparented to the task's immediate parent (if
              any), otherwise detached to root.
            </Text>
          </View>
        </View>
      </Modal>
    </>
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
    padding: 20,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  headerNameWrapper: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 4,
    fontFamily: fonts.quicksand.semiBold,
  },
  dateText: {
    fontSize: 16,
    color: "#7f8c8d",
    fontFamily: fonts.quicksand.medium,
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
  clearAllButton: {
    backgroundColor: "#e74c3c",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
  },
  clearAllButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
    fontFamily: fonts.quicksand.bold,
  },
  section: {
    backgroundColor: "white",
    marginHorizontal: 20,
    marginBottom: 16,
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
    marginBottom: 12,
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
  taskDate: {
    fontSize: 12,
    color: "#7f8c8d",
    marginTop: 2,
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
  emptyText: {
    textAlign: "center",
    color: "#7f8c8d",
    fontStyle: "italic",
    paddingVertical: 20,
    fontFamily: fonts.quicksand.regular,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 8,
    fontFamily: fonts.quicksand.bold,
  },
  modalBodyText: {
    fontSize: 14,
    color: "#7f8c8d",
    marginBottom: 12,
    fontFamily: fonts.quicksand.medium,
  },
  modalActions: {
    gap: 8,
  },
  modalButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 8,
  },
  modalButtonSecondary: {
    backgroundColor: "#ecf0f1",
  },
  modalButtonSecondaryText: {
    color: "#2c3e50",
    fontWeight: "600",
    fontFamily: fonts.quicksand.semiBold,
  },
  modalButtonPrimary: {
    backgroundColor: "#3498db",
  },
  modalButtonPrimaryText: {
    color: "white",
    fontWeight: "700",
    fontFamily: fonts.quicksand.bold,
  },
  modalButtonDanger: {
    backgroundColor: "#e74c3c",
  },
  modalButtonDangerText: {
    color: "white",
    fontWeight: "700",
    fontFamily: fonts.quicksand.bold,
  },
  modalHint: {
    fontSize: 12,
    color: "#7f8c8d",
    marginTop: 8,
    fontFamily: fonts.quicksand.regular,
  },
  upcomingCard: {
    backgroundColor: "white",
    marginHorizontal: 20,
    marginBottom: 16,
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
  upcomingTabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  upcomingTab: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e1e8ed",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  upcomingTabActive: {
    backgroundColor: "#3498db",
    borderColor: "#3498db",
  },
  upcomingTabText: {
    color: "#7f8c8d",
    fontWeight: "600",
    fontFamily: fonts.quicksand.semiBold,
  },
  upcomingTabTextActive: {
    color: "#fff",
    fontFamily: fonts.quicksand.semiBold,
  },
});
