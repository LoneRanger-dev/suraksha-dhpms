"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { API_BASE_URL } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { useRequireAuth } from "@/lib/use-require-auth";

interface QueueItem {
  appointment_id: string;
  patient_id: string;
  patient_display_id: string;
  patient_full_name: string;
  token_number: string;
  time_slot: string;
  status: string;
}

export default function DoctorDashboardPage() {
  const { token } = useRequireAuth(["DOCTOR"]);
  const doctorFullName = useAuthStore((state) => state.doctorFullName);
  const logout = useAuthStore((state) => state.logout);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE_URL}/api/v1/appointments`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setQueue(Array.isArray(data) ? data : []))
      .catch(() => setQueue([]))
      .finally(() => setLoading(false));
  }, [token]);

  if (!token) {
    return null;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Today&apos;s Appointments</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{doctorFullName ?? "Doctor"}</span>
          <Link href="/doctor/follow-ups" className="text-sm text-muted-foreground underline">
            Follow-ups
          </Link>
          <Link href="/notifications" className="text-sm text-muted-foreground underline">
            Notifications
          </Link>
          <button type="button" onClick={logout} className="text-sm text-muted-foreground underline">
            Log out
          </button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Queue</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : queue.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No appointments scheduled yet. Patients checked in by reception will appear here.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {queue.map((item) => (
                <li
                  key={item.appointment_id}
                  className="flex items-center justify-between rounded-md border border-border p-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.patient_full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.patient_display_id} · Token {item.token_number} · {item.time_slot}
                    </p>
                  </div>
                  <Link
                    href={`/doctor/consult?appointmentId=${item.appointment_id}&patientId=${item.patient_id}&patientName=${encodeURIComponent(item.patient_full_name)}`}
                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                  >
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
