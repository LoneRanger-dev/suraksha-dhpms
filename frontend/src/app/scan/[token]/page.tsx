"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { API_BASE_URL } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

interface PublicScanView {
  full_name: string;
  blood_group: string | null;
  allergies: string;
  emergency_contact_phone: string;
}

interface StaffScanView {
  patient_id: string;
  patient_display_id: string;
  full_name: string;
  dob: string;
  gender: string;
  blood_group: string | null;
  allergies: string;
  membership_tier: string;
  card_status: string;
}

const STAFF_ROLES = ["SUPER_ADMIN", "ADMIN", "RECEPTIONIST", "DOCTOR", "NURSE", "PHARMACIST"];

type LoadState =
  | { status: "loading" }
  | { status: "not_found" }
  | { status: "public"; data: PublicScanView }
  | { status: "staff"; data: StaffScanView };

export default function PublicScanPage() {
  const params = useParams();
  const token = typeof params.token === "string" ? params.token : Array.isArray(params.token) ? params.token[0] : "";
  const authToken = useAuthStore((state) => state.token);
  const role = useAuthStore((state) => state.role);
  const isStaff = Boolean(authToken && role && STAFF_ROLES.includes(role));
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function resolve() {
      const headers: Record<string, string> = {};
      if (isStaff && authToken) headers.Authorization = `Bearer ${authToken}`;

      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/scan/${token}`, { headers });
        if (!response.ok) {
          if (!cancelled) setState({ status: "not_found" });
          return;
        }
        const data = await response.json();
        if (cancelled) return;
        setState(isStaff ? { status: "staff", data } : { status: "public", data });
      } catch {
        if (!cancelled) setState({ status: "not_found" });
      }
    }

    resolve();
    return () => {
      cancelled = true;
    };
  }, [token, isStaff, authToken]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-8">
      <h1 className="text-xl font-semibold text-foreground">Suraksha Health Card</h1>

      {state.status === "loading" && <p className="text-sm text-muted-foreground">Resolving card…</p>}

      {state.status === "not_found" && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
          This card is invalid or expired.
        </p>
      )}

      {state.status === "public" && (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Emergency information only
          </p>
          <p className="text-lg font-semibold text-foreground">{state.data.full_name}</p>
          {state.data.blood_group && (
            <p className="text-sm text-foreground">
              Blood group: <span className="font-semibold">{state.data.blood_group}</span>
            </p>
          )}
          <p className="text-sm text-foreground">
            Allergies: <span className="font-semibold">{state.data.allergies}</span>
          </p>
          <p className="text-sm text-foreground">
            Emergency contact: <span className="font-semibold">{state.data.emergency_contact_phone}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Sign in as hospital staff to see the full medical record for this card.
          </p>
        </div>
      )}

      {state.status === "staff" && (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-5">
          <div className="flex items-center justify-between">
            <p className="text-lg font-semibold text-foreground">{state.data.full_name}</p>
            {state.data.blood_group && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
                {state.data.blood_group}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{state.data.patient_display_id}</p>
          <span className="w-fit rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
            {state.data.membership_tier} Member
          </span>
          {state.data.allergies.trim().toUpperCase() !== "NONE" && (
            <p className="rounded-md bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive">
              Allergy Alert: {state.data.allergies}
            </p>
          )}
          <Link
            href="/reception/scanner"
            className="mt-2 w-fit rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Open in scanner
          </Link>
        </div>
      )}
    </main>
  );
}
