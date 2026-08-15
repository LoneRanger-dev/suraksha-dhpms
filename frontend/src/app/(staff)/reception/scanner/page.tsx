"use client";

import { useEffect, useState } from "react";

import type { DoctorOption } from "@/components/qr/QrReaderModal";
import { QrReaderModal } from "@/components/qr/QrReaderModal";
import { Badge } from "@/components/ui/badge";
import { API_BASE_URL } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { useRequireAuth } from "@/lib/use-require-auth";

const STAFF_ROLES = ["RECEPTIONIST", "ADMIN", "SUPER_ADMIN", "NURSE"];

export default function ReceptionScannerPage() {
  const { token } = useRequireAuth(STAFF_ROLES);
  const phone = useAuthStore((state) => state.phone);
  const role = useAuthStore((state) => state.role);
  const logout = useAuthStore((state) => state.logout);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/v1/doctors`)
      .then((res) => res.json())
      .then((data) => setDoctors(Array.isArray(data) ? data : []))
      .catch(() => setDoctors([]));
  }, []);

  if (!token) {
    return null;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Fast-Scan Check-In</h1>
          <p className="text-sm text-muted-foreground">
            {phone} · {role}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="border-success text-success">
            Signed in
          </Badge>
          <button type="button" onClick={logout} className="text-sm text-muted-foreground underline">
            Log out
          </button>
        </div>
      </div>

      <QrReaderModal onClose={() => {}} authToken={token} doctors={doctors} />
    </main>
  );
}
