"use client";

import { useState } from "react";

import { API_BASE_URL } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { useRequireAuth } from "@/lib/use-require-auth";

interface PrescriptionItem {
  item_id: string;
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  intake_instructions: string | null;
}

interface Prescription {
  prescription_id: string;
  patient_id: string;
  instructions: string | null;
  created_at: string;
  dispensed: boolean;
  dispensed_at: string | null;
  items: PrescriptionItem[];
}

const inputClass =
  "rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

export default function PharmacyDispensePage() {
  const { token } = useRequireAuth(["PHARMACIST"]);
  const logout = useAuthStore((state) => state.logout);

  const [query, setQuery] = useState("");
  const [patientName, setPatientName] = useState<string | null>(null);
  const [patientDisplayId, setPatientDisplayId] = useState<string | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLookup() {
    if (!query.trim()) return;
    setError(null);
    setLoading(true);
    setPatientName(null);
    setPrescriptions([]);
    try {
      const scanResponse = await fetch(`${API_BASE_URL}/api/v1/scan/${encodeURIComponent(query.trim())}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!scanResponse.ok) throw new Error("Card not found");
      const patient = await scanResponse.json();
      if (!patient.patient_id) throw new Error("No prescriptions available for this record");

      setPatientName(patient.full_name);
      setPatientDisplayId(patient.patient_display_id ?? null);

      const rxResponse = await fetch(`${API_BASE_URL}/api/v1/consultations/patients/${patient.patient_id}/prescriptions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = rxResponse.ok ? await rxResponse.json() : [];
      setPrescriptions(Array.isArray(data) ? data : []);
    } catch {
      setError("Could not resolve this patient. Try the manual ID or token instead.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDispense(prescriptionId: string) {
    const response = await fetch(`${API_BASE_URL}/api/v1/consultations/prescriptions/${prescriptionId}/dispense`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return;
    const updated: Prescription = await response.json();
    setPrescriptions((prev) => prev.map((rx) => (rx.prescription_id === prescriptionId ? updated : rx)));
  }

  if (!token) {
    return null;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Dispense Prescriptions</h1>
        <button type="button" onClick={logout} className="text-sm text-muted-foreground underline">
          Log out
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="dispense_lookup" className="text-sm font-medium text-foreground">
          Patient ID or Token
        </label>
        <div className="flex gap-2">
          <input
            id="dispense_lookup"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className={`flex-1 ${inputClass}`}
          />
          <button
            type="button"
            onClick={handleLookup}
            disabled={loading}
            className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            Look up
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {patientName && (
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">{patientName}</p>
            {patientDisplayId && <p className="text-xs text-muted-foreground">{patientDisplayId}</p>}
          </div>

          {prescriptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No prescriptions for this patient.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {prescriptions.map((rx) => (
                <li key={rx.prescription_id} className="flex flex-col gap-2 rounded-md border border-border p-3">
                  <p className="text-xs text-muted-foreground">
                    {new Date(rx.created_at).toLocaleDateString("en-IN")}
                  </p>
                  <ul className="flex flex-col gap-1">
                    {rx.items.map((item) => (
                      <li key={item.item_id} className="text-sm text-foreground">
                        <span className="font-semibold">{item.medicine_name}</span> — {item.dosage},{" "}
                        {item.frequency}, {item.duration}
                      </li>
                    ))}
                  </ul>
                  {rx.dispensed ? (
                    <span className="w-fit rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
                      Dispensed
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleDispense(rx.prescription_id)}
                      className="w-fit rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                    >
                      Mark Dispensed
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </main>
  );
}
