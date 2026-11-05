import { Platform } from "react-native";

/**
 * Backend base URL. On web the app is served by the same host as the API
 * (preview, and the published build under /api/web), so use the page origin:
 * this keeps working after publishing without rebuilding for a new URL.
 */
export const API_BASE = Platform.OS === "web" && typeof window !== "undefined" ? window.location.origin : String(process.env.EXPO_PUBLIC_BACKEND_URL);

/** Where the web app itself lives ("/api/web" in the published build, "" in the preview). */
export const WEB_APP_BASE =
  Platform.OS === "web" && typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname.startsWith("/api/web") ? "/api/web" : ""}/` : null;
