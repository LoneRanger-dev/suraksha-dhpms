"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { API_BASE_URL } from "@/lib/api";
import { useRequireAuth } from "@/lib/use-require-auth";

interface NotificationItem {
  notification_id: string;
  recipient_phone: string;
  recipient_role: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

export default function AdminNotificationsPage() {
  const { token } = useRequireAuth(ADMIN_ROLES);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE_URL}/api/v1/notifications`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setNotifications(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [token]);

  if (!token) {
    return null;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground">Every system notification sent, hospital-wide.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/doctors" className="text-sm text-muted-foreground underline">
            Doctors & Departments
          </Link>
          <Link href="/admin/billing" className="text-sm text-muted-foreground underline">
            Billing
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : notifications.length === 0 ? (
        <p className="text-sm text-muted-foreground">No notifications sent yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {notifications.map((n) => (
            <li key={n.notification_id} className="rounded-md border border-border p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">{n.title}</p>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    n.is_read ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                  }`}
                >
                  {n.is_read ? "Read" : "Unread"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{n.message}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                To {n.recipient_phone} ({n.recipient_role}) · {new Date(n.created_at).toLocaleString("en-IN")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
