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

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

export default function AdminAppointmentsPage() {
  const { token } = useRequireAuth(ADMIN_ROLES);
  const [appointments, setAppointments] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE_URL}/api/v1/appointments`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setAppointments(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [token]);

  if (!token) {
    return null;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Appointments</h1>
          <p className="text-sm text-muted-foreground">Every OPD token issued today, across all departments.</p>
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
      ) : appointments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No appointments today.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Token</th>
                <th className="px-3 py-2">Patient</th>
                <th className="px-3 py-2">Doctor</th>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appt) => (
                <tr key={appt.appointment_id} className="border-t border-border">
                  <td className="px-3 py-2 font-mono text-xs text-foreground">{appt.token_number}</td>
                  <td className="px-3 py-2 text-foreground">
                    {appt.patient_full_name}
                    <span className="ml-1 text-xs text-muted-foreground">{appt.patient_display_id}</span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{appt.doctor_full_name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{appt.time_slot}</td>
                  <td className="px-3 py-2 text-muted-foreground">{appt.status.replace("_", " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
