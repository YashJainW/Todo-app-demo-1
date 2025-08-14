import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as DocumentPicker from "expo-document-picker";
import { useAuth } from "../hooks/useAuth";
import { supabase, Task } from "../lib/supabase";
import i18n from "../constants/i18n";

interface TaskFormData {
  name: string;
  description: string;
  type: "Daily" | "Weekly" | "Monthly" | "Yearly";
  priority: number;
  timeframe: {
    date?: string;
    startDate?: string;
    endDate?: string;
    month?: number;
    year?: number;
  };
  parent_id?: string;
  attachments: Array<{ name: string; url: string }>;
}

interface ParentTask {
  id: string;
  name: string;
  type: string;
  timeframe?: {
    startDate?: string;
    endDate?: string;
    month?: number;
    year?: number;
  };
}

export default function AddEditTaskScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const isEditing = params.id !== undefined;

  const [formData, setFormData] = useState<TaskFormData>({
    name: "",
    description: "",
    type: "Daily",
    priority: 3,
    timeframe: {},
    attachments: [],
  });

  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [parentTasks, setParentTasks] = useState<ParentTask[]>([]);
  const [showParentPicker, setShowParentPicker] = useState(false);
  const [showWeekPicker, setShowWeekPicker] = useState(false);
  const [weekAnchor, setWeekAnchor] = useState<Date>(new Date());

  useEffect(() => {
    if (isEditing && params.id) {
      fetchTask(params.id as string);
    }
    fetchParentTasks();
  }, [isEditing, params.id]);

  useEffect(() => {
    if (!isEditing && params.type) {
      const t = String(params.type);
      if (
        t === "Daily" ||
        t === "Weekly" ||
        t === "Monthly" ||
        t === "Yearly"
      ) {
        setFormData((prev) => ({ ...prev, type: t as any, timeframe: {} }));
      }
    }
  }, [isEditing, params.type]);

  useEffect(() => {
    // Refresh parent tasks when type changes
    fetchParentTasks();
  }, [formData.type]);

  useEffect(() => {
    // Refresh parent tasks when timeframe changes (date, start/end, month/year)
    fetchParentTasks();
  }, [JSON.stringify(formData.timeframe)]);

  const fetchTask = async (id: string) => {
    const sb = supabase;
    if (!sb) {
      Alert.alert("Error", "Supabase is not configured");
      return;
    }
    try {
      const { data, error } = await sb
        .from("tasks")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      setFormData({
        name: data.name,
        description: data.description || "",
        type: data.type,
        priority: data.priority,
        timeframe: data.timeframe,
        parent_id: data.parent_id,
        attachments: data.attachments || [],
      });
    } catch (error) {
      console.error("Error fetching task:", error);
      Alert.alert("Error", "Failed to load task");
    }
  };

  const fetchParentTasks = async () => {
    if (!user) return;

    const sb = supabase;
    if (!sb) return;

    try {
      // 1) Load candidate parents by allowed types
      const allowedTypes = getAllowedParentTypes(formData.type);
      const { data, error } = await sb
        .from("tasks")
        .select("id, name, type, timeframe, parent_id")
        .eq("user_id", user.id)
        .in("type", allowedTypes)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const candidates: ParentTask[] = ((data as any) || []) as ParentTask[];

      // 2) Exclude self and descendants when editing to prevent cycles
      let excludeIds = new Set<string>();
      const currentId = (params.id as string) || undefined;
      if (currentId) {
        excludeIds.add(currentId);
        // build id -> children map
        const { data: allIds } = await sb
          .from("tasks")
          .select("id, parent_id")
          .eq("user_id", user.id);
        const childMap = new Map<string, string[]>();
        (allIds as any[])?.forEach((r) => {
          const pid = r.parent_id as string | null;
          const cid = r.id as string;
          if (pid) {
            const arr = childMap.get(pid) || [];
            arr.push(cid);
            childMap.set(pid, arr);
          }
        });
        const stack = [currentId];
        while (stack.length) {
          const nid = stack.pop()!;
          const children = childMap.get(nid) || [];
          children.forEach((cid) => {
            if (!excludeIds.has(cid)) {
              excludeIds.add(cid);
              stack.push(cid);
            }
          });
        }
      }

      // 3) Timeframe containment filter in app
      const filtered = candidates.filter((p) => {
        if (excludeIds.has((p as any).id)) return false;
        return timeframeContains(p, formData);
      });

      setParentTasks(filtered);
    } catch (error) {
      console.error("Error fetching parent tasks:", error);
    }
  };

  const getAllowedParentTypes = (
    type: string
  ): Array<"Daily" | "Weekly" | "Monthly" | "Yearly"> => {
    switch (type) {
      case "Daily":
        return ["Weekly", "Monthly", "Yearly"];
      case "Weekly":
        return ["Monthly", "Yearly"];
      case "Monthly":
        return ["Yearly"];
      case "Yearly":
        return [];
      default:
        return [];
    }
  };

  const timeframeContains = (
    parent: ParentTask,
    childForm: TaskFormData
  ): boolean => {
    const parentType = parent.type as TaskFormData["type"];
    const childType = childForm.type;
    const pt = parent.timeframe || {};
    const ct = childForm.timeframe || {};

    if (parentType === "Yearly") {
      if (!pt.year) return false;
      if (childType === "Daily")
        return !!ct.date && new Date(ct.date).getFullYear() === pt.year;
      if (childType === "Weekly") {
        const anchor = ct.startDate || ct.endDate;
        return !!anchor && new Date(anchor).getFullYear() === pt.year;
      }
      if (childType === "Monthly") return ct.year === pt.year;
      return false;
    }

    if (parentType === "Monthly") {
      if (!pt.month || !pt.year) return false;
      if (childType === "Daily") {
        if (!ct.date) return false;
        const d = new Date(ct.date);
        return d.getFullYear() === pt.year && d.getMonth() + 1 === pt.month;
      }
      if (childType === "Weekly") {
        const anchor = ct.startDate || ct.endDate;
        if (!anchor) return false;
        const d = new Date(anchor);
        return d.getFullYear() === pt.year && d.getMonth() + 1 === pt.month;
      }
      return false;
    }

    if (parentType === "Weekly") {
      if (!pt.startDate || !pt.endDate) return false;
      if (childType === "Daily") {
        if (!ct.date) return false;
        return pt.startDate <= ct.date && ct.date <= pt.endDate;
      }
      return false;
    }

    return false;
  };

  const updateTimeframe = (type: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      timeframe: { ...prev.timeframe, [type]: value },
    }));
  };

  const getWeekRange = (date: Date) => {
    const dayIndexMondayBased = (date.getDay() + 6) % 7; // 0 = Monday ... 6 = Sunday
    const monday = new Date(date);
    monday.setHours(12, 0, 0, 0); // normalize to avoid TZ edge cases
    monday.setDate(monday.getDate() - dayIndexMondayBased);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const toIsoDate = (d: Date) =>
      new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
        .toISOString()
        .split("T")[0];
    return { start: toIsoDate(monday), end: toIsoDate(sunday) };
  };

  const formatShortDate = (isoDate: string) => {
    const d = new Date(isoDate + "T00:00:00Z");
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    });
  };

  const formatLabelDate = (isoDate: string) => {
    const d = new Date(isoDate + "T00:00:00Z");
    const day = String(d.getUTCDate()).padStart(2, "0");
    const month = d.toLocaleString("en-GB", {
      month: "short",
      timeZone: "UTC",
    });
    const year2 = String(d.getUTCFullYear()).slice(-2);
    return `${day} ${month}'${year2}`;
  };

  const generateWeekOptions = () => {
    const now = new Date();
    const { start: startIso } = getWeekRange(now);
    const startMonday = new Date(startIso + "T00:00:00Z");
    const limitDate = new Date(now);
    limitDate.setMonth(limitDate.getMonth() + 3);
    const { end: endIso } = getWeekRange(limitDate);
    const endSunday = new Date(endIso + "T00:00:00Z");

    const options: Array<{ start: string; end: string }> = [];
    for (
      let d = new Date(startMonday);
      d <= endSunday;
      d.setDate(d.getDate() + 7)
    ) {
      const { start, end } = getWeekRange(d);
      options.push({ start, end });
    }
    return options;
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert("Error", "Task name is required");
      return;
    }

    const sb = supabase;
    if (!sb) {
      Alert.alert("Error", "Supabase is not configured");
      return;
    }

    setLoading(true);
    try {
      const taskData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        type: formData.type,
        priority: formData.priority,
        timeframe: formData.timeframe,
        parent_id: formData.parent_id,
        attachments: formData.attachments,
        user_id: user!.id,
      };

      if (isEditing) {
        const { error } = await sb
          .from("tasks")
          .update(taskData)
          .eq("id", params.id);

        if (error) throw error;
        Alert.alert("Success", "Task updated successfully");
      } else {
        const { error } = await sb.from("tasks").insert(taskData);

        if (error) throw error;
        Alert.alert("Success", "Task created successfully");
      }

      router.back();
    } catch (error) {
      console.error("Error saving task:", error);
      Alert.alert("Error", "Failed to save task");
    } finally {
      setLoading(false);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        // In a real app, you would upload this to Supabase Storage
        // For now, we'll just add it to the attachments array
        setFormData((prev) => ({
          ...prev,
          attachments: [
            ...prev.attachments,
            { name: file.name, url: file.uri },
          ],
        }));
      }
    } catch (error) {
      console.error("Error picking document:", error);
    }
  };

  const removeAttachment = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }));
  };

  const renderTimeframeInput = () => {
    switch (formData.type) {
      case "Daily":
        return (
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateInputText}>
              {formData.timeframe.date || "Select Date"}
            </Text>
            <Ionicons name="calendar" size={20} color="#7f8c8d" />
          </TouchableOpacity>
        );

      case "Weekly":
        return (
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => setShowWeekPicker(true)}
          >
            <Text style={styles.dateInputText}>
              {formData.timeframe.startDate && formData.timeframe.endDate ? (
                <Text>
                  <Text style={styles.weekDateStrong}>
                    {formatLabelDate(formData.timeframe.startDate)}
                  </Text>
                  {" -> "}
                  <Text style={styles.weekDateStrong}>
                    {formatLabelDate(formData.timeframe.endDate)}
                  </Text>
                </Text>
              ) : (
                "Select Week"
              )}
            </Text>
            <Ionicons name="calendar" size={20} color="#7f8c8d" />
          </TouchableOpacity>
        );

      case "Monthly":
        return (
          <View style={styles.monthYearInputs}>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowMonthPicker(true)}
            >
              <Text style={styles.dateInputText}>
                {formData.timeframe.month
                  ? new Date(
                      2024,
                      formData.timeframe.month - 1
                    ).toLocaleDateString("en-US", { month: "long" })
                  : "Select Month"}
              </Text>
              <Ionicons name="calendar" size={20} color="#7f8c8d" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowYearPicker(true)}
            >
              <Text style={styles.dateInputText}>
                {formData.timeframe.year || "Select Year"}
              </Text>
              <Ionicons name="calendar" size={20} color="#7f8c8d" />
            </TouchableOpacity>
          </View>
        );

      case "Yearly":
        return (
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => setShowYearPicker(true)}
          >
            <Text style={styles.dateInputText}>
              {formData.timeframe.year || "Select Year"}
            </Text>
            <Ionicons name="calendar" size={20} color="#7f8c8d" />
          </TouchableOpacity>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={24} color="#2c3e50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? i18n.t("tasks.editTask") : i18n.t("tasks.addTask")}
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={loading}
          style={styles.saveButton}
        >
          <Text style={styles.saveButtonText}>
            {loading ? i18n.t("common.loading") : i18n.t("common.save")}
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.content}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{i18n.t("tasks.taskName")}</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, name: text }))
                }
                placeholder="Enter task name"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{i18n.t("tasks.description")}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, description: text }))
                }
                placeholder="Enter task description (optional)"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{i18n.t("tasks.type")}</Text>
              <View style={styles.typeButtons}>
                {(["Daily", "Weekly", "Monthly", "Yearly"] as const).map(
                  (type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeButton,
                        formData.type === type && styles.typeButtonActive,
                      ]}
                      onPress={() => {
                        setFormData((prev) => ({
                          ...prev,
                          type,
                          timeframe: {},
                        }));
                        fetchParentTasks();
                      }}
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          formData.type === type && styles.typeButtonTextActive,
                        ]}
                      >
                        {i18n.t(`tasks.${type.toLowerCase()}`)}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{i18n.t("tasks.priority")}</Text>
              <View style={styles.priorityButtons}>
                {[1, 2, 3, 4, 5].map((priority) => (
                  <TouchableOpacity
                    key={priority}
                    style={[
                      styles.priorityButton,
                      formData.priority === priority &&
                        styles.priorityButtonActive,
                    ]}
                    onPress={() =>
                      setFormData((prev) => ({ ...prev, priority }))
                    }
                  >
                    <Text
                      style={[
                        styles.priorityButtonText,
                        formData.priority === priority &&
                          styles.priorityButtonTextActive,
                      ]}
                    >
                      {priority}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.priorityLabel}>
                {i18n.t(`tasks.priority${formData.priority}`)}
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Timeframe</Text>
              {renderTimeframeInput()}
            </View>

            {formData.type !== "Yearly" && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{i18n.t("tasks.parentTask")}</Text>
                <TouchableOpacity
                  style={styles.parentInput}
                  onPress={() => setShowParentPicker(true)}
                >
                  <Text style={styles.parentInputText}>
                    {formData.parent_id
                      ? parentTasks.find((t) => t.id === formData.parent_id)
                          ?.name || "Unknown"
                      : "Select parent task (optional)"}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#7f8c8d" />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{i18n.t("tasks.attachments")}</Text>
              <TouchableOpacity
                style={styles.addAttachmentButton}
                onPress={pickDocument}
              >
                <Ionicons name="attach" size={20} color="#3498db" />
                <Text style={styles.addAttachmentText}>
                  {i18n.t("tasks.addAttachment")}
                </Text>
              </TouchableOpacity>

              {formData.attachments.map((attachment, index) => (
                <View key={index} style={styles.attachmentItem}>
                  <Text style={styles.attachmentName}>{attachment.name}</Text>
                  <TouchableOpacity onPress={() => removeAttachment(index)}>
                    <Ionicons name="close-circle" size={20} color="#e74c3c" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date Pickers */}
      {showDatePicker && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) {
              updateTimeframe("date", date.toISOString().split("T")[0]);
            }
          }}
        />
      )}

      {/* Week Picker Modal */}
      <Modal
        visible={showWeekPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWeekPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Week</Text>
              <View
                style={{ flexDirection: "row", gap: 12, alignItems: "center" }}
              >
                <TouchableOpacity
                  onPress={() =>
                    setWeekAnchor(
                      (prev) =>
                        new Date(
                          prev.getFullYear(),
                          prev.getMonth(),
                          prev.getDate() - 7
                        )
                    )
                  }
                >
                  <Ionicons name="chevron-back" size={22} color="#2c3e50" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    setWeekAnchor(
                      (prev) =>
                        new Date(
                          prev.getFullYear(),
                          prev.getMonth(),
                          prev.getDate() + 7
                        )
                    )
                  }
                >
                  <Ionicons name="chevron-forward" size={22} color="#2c3e50" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowWeekPicker(false)}>
                  <Ionicons name="close" size={24} color="#2c3e50" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={styles.modalBody}>
              {generateWeekOptions().map((w) => (
                <TouchableOpacity
                  key={`${w.start}_${w.end}`}
                  style={styles.parentOption}
                  onPress={() => {
                    setFormData((prev) => ({
                      ...prev,
                      timeframe: {
                        ...prev.timeframe,
                        startDate: w.start,
                        endDate: w.end,
                      },
                    }));
                    setShowWeekPicker(false);
                  }}
                >
                  <Text style={styles.parentOptionText}>
                    <Text style={styles.weekDateStrong}>
                      {formatLabelDate(w.start)}
                    </Text>
                    {" -> "}
                    <Text style={styles.weekDateStrong}>
                      {formatLabelDate(w.end)}
                    </Text>
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Month Picker Modal */}
      <Modal
        visible={showMonthPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMonthPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Month</Text>
              <TouchableOpacity onPress={() => setShowMonthPicker(false)}>
                <Ionicons name="close" size={24} color="#2c3e50" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {[
                "January",
                "February",
                "March",
                "April",
                "May",
                "June",
                "July",
                "August",
                "September",
                "October",
                "November",
                "December",
              ].map((label, index) => (
                <TouchableOpacity
                  key={label}
                  style={styles.parentOption}
                  onPress={() => {
                    setFormData((prev) => ({
                      ...prev,
                      timeframe: { ...prev.timeframe, month: index + 1 },
                    }));
                    setShowMonthPicker(false);
                  }}
                >
                  <Text style={styles.parentOptionText}>{label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Year Picker Modal */}
      <Modal
        visible={showYearPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowYearPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Year</Text>
              <TouchableOpacity onPress={() => setShowYearPicker(false)}>
                <Ionicons name="close" size={24} color="#2c3e50" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {(() => {
                const current = new Date().getFullYear();
                const years: number[] = [];
                for (let y = current - 10; y <= current + 10; y += 1)
                  years.push(y);
                return years;
              })().map((y) => (
                <TouchableOpacity
                  key={y}
                  style={styles.parentOption}
                  onPress={() => {
                    setFormData((prev) => ({
                      ...prev,
                      timeframe: { ...prev.timeframe, year: y },
                    }));
                    setShowYearPicker(false);
                  }}
                >
                  <Text style={styles.parentOptionText}>{y}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Parent Task Picker Modal */}
      <Modal
        visible={showParentPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowParentPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Parent Task</Text>
              <TouchableOpacity onPress={() => setShowParentPicker(false)}>
                <Ionicons name="close" size={24} color="#2c3e50" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <TouchableOpacity
                style={styles.parentOption}
                onPress={() => {
                  setFormData((prev) => ({ ...prev, parent_id: undefined }));
                  setShowParentPicker(false);
                }}
              >
                <Text style={styles.parentOptionText}>No parent task</Text>
              </TouchableOpacity>

              {parentTasks.map((task) => (
                <TouchableOpacity
                  key={task.id}
                  style={styles.parentOption}
                  onPress={() => {
                    setFormData((prev) => ({ ...prev, parent_id: task.id }));
                    setShowParentPicker(false);
                  }}
                >
                  <Text style={styles.parentOptionText}>{task.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e1e8ed",
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
  },
  saveButton: {
    backgroundColor: "#3498db",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: "white",
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e1e8ed",
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: "white",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  typeButtons: {
    flexDirection: "row",
    gap: 8,
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e1e8ed",
    backgroundColor: "white",
    alignItems: "center",
  },
  typeButtonActive: {
    backgroundColor: "#3498db",
    borderColor: "#3498db",
  },
  typeButtonText: {
    color: "#7f8c8d",
    fontWeight: "500",
  },
  typeButtonTextActive: {
    color: "white",
  },
  priorityButtons: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  priorityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e1e8ed",
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  priorityButtonActive: {
    backgroundColor: "#3498db",
    borderColor: "#3498db",
  },
  priorityButtonText: {
    color: "#7f8c8d",
    fontWeight: "600",
  },
  priorityButtonTextActive: {
    color: "white",
  },
  priorityLabel: {
    fontSize: 14,
    color: "#7f8c8d",
    textAlign: "center",
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e1e8ed",
    borderRadius: 8,
    padding: 16,
    backgroundColor: "white",
  },
  dateInputText: {
    fontSize: 16,
    color: "#2c3e50",
  },
  weekInputs: {
    gap: 12,
  },
  monthYearInputs: {
    gap: 12,
  },
  parentInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e1e8ed",
    borderRadius: 8,
    padding: 16,
    backgroundColor: "white",
  },
  parentInputText: {
    fontSize: 16,
    color: "#2c3e50",
  },
  addAttachmentButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#3498db",
    borderStyle: "dashed",
    borderRadius: 8,
    padding: 16,
    backgroundColor: "white",
  },
  addAttachmentText: {
    color: "#3498db",
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 8,
  },
  attachmentItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "white",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#e1e8ed",
  },
  attachmentName: {
    fontSize: 14,
    color: "#2c3e50",
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e8ed",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
  },
  modalBody: {
    padding: 20,
  },
  parentOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f4",
  },
  parentOptionText: {
    fontSize: 16,
    color: "#2c3e50",
  },
  weekDateStrong: {
    fontSize: 16,
    color: "#2c3e50",
    fontWeight: "700",
  },
});
