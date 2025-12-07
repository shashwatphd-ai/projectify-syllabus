import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";

/**
 * Component that initializes realtime notification subscriptions.
 * Must be rendered inside AuthProvider and NotificationProvider.
 */
export function RealtimeNotificationListener() {
  useRealtimeNotifications();
  return null;
}
