"use client";

import { useEffect, useState } from "react";

import { API_BASE_URL } from "@/lib/api";
import { useRequireAuth } from "@/lib/use-require-auth";

interface NotificationItem {
  notification_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const { token } = useRequireAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE_URL}/api/v1/notifications/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setNotifications(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleMarkRead(notificationId: string) {
    if (!token) return;
    setNotifications((prev) =>
      prev.map((n) => (n.notification_id === notificationId ? { ...n, is_read: true } : n))
    );
    await fetch(`${API_BASE_URL}/api/v1/notifications/${notificationId}/read`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  if (!token) {
    return null;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold text-foreground">Notifications</h1>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : notifications.length === 0 ? (
        <p className="text-sm text-muted-foreground">No notifications yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {notifications.map((notification) => (
            <li key={notification.notification_id}>
              <button
                type="button"
                onClick={() => handleMarkRead(notification.notification_id)}
                disabled={notification.is_read}
                className={`flex w-full flex-col gap-1 rounded-md border p-3 text-left ${
                  notification.is_read ? "border-border" : "border-primary bg-secondary/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">{notification.title}</p>
                  {!notification.is_read && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase text-primary-foreground">
                      Unread
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{notification.message}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(notification.created_at).toLocaleString("en-IN")}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
