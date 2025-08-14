import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setupURLPolyfill } from "react-native-url-polyfill";

// Setup URL polyfill for React Native
setupURLPolyfill();

// Supabase credentials - set these in your .env file
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Check if credentials are properly configured
if (
  !supabaseUrl ||
  !supabaseAnonKey ||
  supabaseUrl === "YOUR_SUPABASE_URL" ||
  supabaseAnonKey === "YOUR_SUPABASE_ANON_KEY"
) {
  console.warn(
    "⚠️ Supabase credentials not configured. Please create a .env file with:\n" +
      "EXPO_PUBLIC_SUPABASE_URL=your-project-url\n" +
      "EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key\n" +
      "You can find these in your Supabase project dashboard."
  );
}

// Only create client if credentials are available
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;

// Database types
export interface Task {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  type: "Daily" | "Weekly" | "Monthly" | "Yearly";
  priority: number;
  is_completed: boolean;
  timeframe: {
    date?: string;
    startDate?: string;
    endDate?: string;
    month?: number;
    year?: number;
  };
  parent_id?: string;
  attachments?: Array<{
    name: string;
    url: string;
  }>;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  created_at: string;
}
