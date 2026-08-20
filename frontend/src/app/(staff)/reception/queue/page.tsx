"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { API_BASE_URL } from "@/lib/api";
import { useRequireAuth } from "@/lib/use-require-auth";

interface QueueItem {
  appointment_id: string;
  patient_display_id: string;
  patient_full_name: string;
  doctor_full_name: string;
  token_number: string;
  time_slot: string;
  status: string;
}

const STAFF_ROLES = ["RECEPTIONIST", "ADMIN", "SUPER_ADMIN", "NURSE"];

const STATUS_STYLES: Record<string, string> = {
  SCHEDULED: "bg-warning/10 text-warning",
  CHECKED_IN: "bg-primary/10 text-primary",
  IN_CONSULTATION: "bg-primary/10 text-primary",
  COMPLETED: "bg-success/10 text-success",
  CANCELLED: "bg-destructive/10 text-destructive",
  NO_SHOW: "bg-destructive/10 text-destructive",
};

export default function ReceptionQueuePage() {
  const { token } = useRequireAuth(STAFF_ROLES);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE_URL}/api/v1/appointments`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setQueue(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [token]);

  if (!token) {
    return null;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Today&apos;s OPD Queue</h1>
          <p className="text-sm text-muted-foreground">Live token board across every department.</p>
        </div>
        <Link href="/reception/scanner" className="text-sm text-muted-foreground underline">
          Scanner
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : queue.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tokens issued yet today.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {queue.map((item) => (
            <li
              key={item.appointment_id}
              className="flex items-center justify-between rounded-md border border-border p-3"
            >
              <div className="flex items-center gap-3">
                <span className="rounded-md bg-secondary px-2 py-1 text-sm font-bold text-secondary-foreground">
                  {item.token_number}
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.patient_full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.patient_display_id} · {item.doctor_full_name} · {item.time_slot}
                  </p>
                </div>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[item.status] ?? "bg-muted text-muted-foreground"}`}
              >
                {item.status.replace("_", " ")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
