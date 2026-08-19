"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { API_BASE_URL } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { useRequireAuth } from "@/lib/use-require-auth";

interface FollowUpItem {
  visit_id: string;
  patient_id: string;
  patient_display_id: string;
  patient_full_name: string;
  diagnosis: string;
  follow_up_date: string;
}

export default function DoctorFollowUpsPage() {
  const { token } = useRequireAuth(["DOCTOR"]);
  const doctorFullName = useAuthStore((state) => state.doctorFullName);
  const [followUps, setFollowUps] = useState<FollowUpItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE_URL}/api/v1/consultations/follow-ups`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setFollowUps(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [token]);

  if (!token) {
    return null;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Follow-ups</h1>
        <span className="text-sm text-muted-foreground">{doctorFullName ?? "Doctor"}</span>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : followUps.length === 0 ? (
        <p className="text-sm text-muted-foreground">No upcoming follow-ups.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {followUps.map((item) => (
            <li
              key={item.visit_id}
              className="flex items-center justify-between rounded-md border border-border p-3"
            >
              <div>
                <p className="text-sm font-semibold text-foreground">{item.patient_full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.patient_display_id} · {item.diagnosis} · Due {item.follow_up_date}
                </p>
              </div>
              <Link
                href={`/doctor/consult?patientId=${item.patient_id}&patientName=${encodeURIComponent(item.patient_full_name)}`}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
              >
                Open
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
