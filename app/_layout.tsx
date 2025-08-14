import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { fonts } from "../lib/fonts";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    [fonts.quicksand.regular]: require("../assets/fonts/Quicksand-Regular.ttf"),
    [fonts.quicksand.medium]: require("../assets/fonts/Quicksand-Medium.ttf"),
    [fonts.quicksand
      .semiBold]: require("../assets/fonts/Quicksand-SemiBold.ttf"),
    [fonts.quicksand.bold]: require("../assets/fonts/Quicksand-Bold.ttf"),
    [fonts.quicksand.light]: require("../assets/fonts/Quicksand-Light.ttf"),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar hidden={Platform.OS === "android"} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="add-edit-task" />
        <Stack.Screen
          name="profile"
          options={{ headerShown: true, title: "Profile" }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
