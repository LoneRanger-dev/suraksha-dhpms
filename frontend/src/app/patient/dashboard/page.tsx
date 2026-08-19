"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PatientHealthCard } from "@/components/cards/PatientHealthCard";
import { API_BASE_URL } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { useRequireAuth } from "@/lib/use-require-auth";

interface PatientMe {
  patient_id: string;
  patient_display_id: string;
  full_name: string;
  dob: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  blood_group: string | null;
  known_allergies: string;
  emergency_contact_phone: string;
  qr_card: { expiry_date: string };
  membership_tier: "FREE" | "SILVER" | "GOLD" | "PLATINUM";
  membership_plan_name: string;
}

export default function PatientDashboardPage() {
  const { token } = useRequireAuth(["PATIENT"]);
  const logout = useAuthStore((state) => state.logout);
  const [patient, setPatient] = useState<PatientMe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE_URL}/api/v1/patients/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setPatient(data))
      .finally(() => setLoading(false));
  }, [token]);

  if (!token) {
    return null;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">My Health Card</h1>
        <button type="button" onClick={logout} className="text-sm text-muted-foreground underline">
          Log out
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !patient ? (
        <p className="text-sm text-destructive">Could not load your health card. Please try again later.</p>
      ) : (
        <div className="flex flex-col gap-4">
          <PatientHealthCard
            fullName={patient.full_name}
            patientDisplayId={patient.patient_display_id}
            dob={patient.dob}
            gender={patient.gender}
            bloodGroup={patient.blood_group ?? undefined}
            allergies={patient.known_allergies}
            membershipTier={patient.membership_tier}
            validThru={patient.qr_card.expiry_date}
            emergencyPhone={patient.emergency_contact_phone}
          />
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm font-semibold text-foreground">{patient.membership_plan_name}</p>
            <p className="text-xs text-muted-foreground">
              {patient.membership_tier} Member · Card ID {patient.patient_display_id}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/patient/family"
              className="w-fit rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground"
            >
              Family Members
            </Link>
            <Link
              href="/patient/appointments"
              className="w-fit rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground"
            >
              My Appointments
            </Link>
            <Link
              href="/patient/records"
              className="w-fit rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground"
            >
              Medical Records & Bills
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
