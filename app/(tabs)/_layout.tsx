import { Tabs, Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../hooks/useAuth";
import i18n from "../../constants/i18n";

export default function TabLayout() {
  const { signOut, user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#3498db",
        tabBarInactiveTintColor: "#7f8c8d",
        tabBarStyle: {
          backgroundColor: "white",
          borderTopWidth: 1,
          borderTopColor: "#e1e8ed",
          paddingBottom: 5,
          paddingTop: 5,
        },
        headerStyle: {
          backgroundColor: "#3498db",
        },
        headerTintColor: "white",
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: i18n.t("navigation.home"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
          headerRight: () => (
            <Ionicons
              name="log-out-outline"
              size={24}
              color="white"
              style={{ marginRight: 16 }}
              onPress={signOut}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="daily"
        options={{
          title: i18n.t("navigation.daily"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="weekly"
        options={{
          title: i18n.t("navigation.weekly"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="monthly"
        options={{
          title: i18n.t("navigation.monthly"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-clear" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="yearly"
        options={{
          title: i18n.t("navigation.yearly"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-number" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
