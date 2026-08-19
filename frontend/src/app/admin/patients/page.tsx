"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { API_BASE_URL } from "@/lib/api";
import { useRequireAuth } from "@/lib/use-require-auth";

interface PatientItem {
  patient_id: string;
  patient_display_id: string;
  full_name: string;
  dob: string;
  gender: string;
  emergency_contact_phone: string;
  created_at: string;
}

const inputClass =
  "rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

const ROLES = ["RECEPTIONIST", "ADMIN", "SUPER_ADMIN"];

export default function AdminPatientsPage() {
  const { token } = useRequireAuth(ROLES);
  const [patients, setPatients] = useState<PatientItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const url = new URL(`${API_BASE_URL}/api/v1/patients`);
    if (search) url.searchParams.set("search", search);

    fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setPatients(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [token, search]);

  if (!token) {
    return null;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Patients</h1>
        <Link href="/admin/doctors" className="text-sm text-muted-foreground underline">
          Doctors & Departments
        </Link>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="patient_search" className="text-sm font-medium text-foreground">
          Search by name or Patient ID
        </label>
        <input
          id="patient_search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className={inputClass}
          placeholder="e.g., SUR-2026-000010 or a name"
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : patients.length === 0 ? (
        <p className="text-sm text-muted-foreground">No patients found.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {patients.map((patient) => (
            <li key={patient.patient_id} className="rounded-md border border-border p-3">
              <p className="text-sm font-semibold text-foreground">{patient.full_name}</p>
              <p className="text-xs text-muted-foreground">
                {patient.patient_display_id} · {patient.gender} · DOB {patient.dob}
              </p>
              <p className="text-xs text-muted-foreground">{patient.emergency_contact_phone}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
