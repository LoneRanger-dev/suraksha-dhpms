"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { VitalsForm, type VitalsFormValues } from "@/components/clinical/VitalsForm";
import { API_BASE_URL } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { useRequireAuth } from "@/lib/use-require-auth";

interface PastVisit {
  visit_id: string;
  chief_complaint: string;
  diagnosis: string;
  visit_date: string;
}

interface PrescriptionItemInput {
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  intake_instructions: string;
}

const EMPTY_ITEM: PrescriptionItemInput = {
  medicine_name: "",
  dosage: "",
  frequency: "",
  duration: "",
  intake_instructions: "",
};

const inputClass =
  "rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

function ConsultPageContent() {
  const { token } = useRequireAuth(["DOCTOR"]);
  const searchParams = useSearchParams();
  const doctorFullName = useAuthStore((state) => state.doctorFullName);

  const appointmentId = searchParams.get("appointmentId");
  const patientId = searchParams.get("patientId");
  const patientName = searchParams.get("patientName") ?? "Patient";

  const [vitals, setVitals] = useState<VitalsFormValues | null>(null);
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [doctorNotes, setDoctorNotes] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [visitId, setVisitId] = useState<string | null>(null);
  const [savingVisit, setSavingVisit] = useState(false);
  const [visitError, setVisitError] = useState<string | null>(null);

  const [items, setItems] = useState<PrescriptionItemInput[]>([{ ...EMPTY_ITEM }]);
  const [prescriptionInstructions, setPrescriptionInstructions] = useState("");
  const [prescriptionSaved, setPrescriptionSaved] = useState(false);
  const [savingPrescription, setSavingPrescription] = useState(false);
  const [prescriptionError, setPrescriptionError] = useState<string | null>(null);

  const [history, setHistory] = useState<PastVisit[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    if (!token || !patientId) return;
    fetch(`${API_BASE_URL}/api/v1/consultations/patients/${patientId}/history`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setHistory(Array.isArray(data) ? data : []))
      .finally(() => setHistoryLoading(false));
  }, [token, patientId]);

  async function handleSaveVisit() {
    if (!patientId) return;
    setVisitError(null);
    setSavingVisit(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/consultations/visits`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          appointment_id: appointmentId || undefined,
          patient_id: patientId,
          chief_complaint: chiefComplaint,
          symptoms: [],
          vitals: vitals
            ? {
                bp: vitals.bp || undefined,
                pulse: vitals.pulse,
                temp_f: vitals.temp_f,
                spo2: vitals.spo2,
                weight_kg: vitals.weight_kg,
              }
            : undefined,
          diagnosis,
          doctor_notes: doctorNotes || undefined,
          follow_up_date: followUpDate || undefined,
        }),
      });
      if (!response.ok) throw new Error("Failed to save visit");
      const data = await response.json();
      setVisitId(data.visit_id);
    } catch {
      setVisitError("Could not save this visit. Please try again.");
    } finally {
      setSavingVisit(false);
    }
  }

  function updateItem(index: number, field: keyof PrescriptionItemInput, value: string) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }

  function addItem() {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSavePrescription() {
    if (!visitId) return;
    setPrescriptionError(null);
    setSavingPrescription(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/consultations/visits/${visitId}/prescriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          instructions: prescriptionInstructions || undefined,
          items: items
            .filter((item) => item.medicine_name.trim().length > 0)
            .map((item) => ({ ...item, intake_instructions: item.intake_instructions || undefined })),
        }),
      });
      if (!response.ok) throw new Error("Failed to save prescription");
      setPrescriptionSaved(true);
    } catch {
      setPrescriptionError("Could not save the prescription. Please try again.");
    } finally {
      setSavingPrescription(false);
    }
  }

  if (!token) {
    return null;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{patientName}</h1>
        <p className="text-sm text-muted-foreground">Consultation · {doctorFullName ?? "Doctor"}</p>
      </div>

      <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <h2 className="text-sm font-semibold text-foreground">Patient History</h2>
        {historyLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No previous visits on record.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {history.map((visit) => (
              <li key={visit.visit_id} className="rounded-md border border-border p-3">
                <p className="text-sm font-semibold text-foreground">{visit.diagnosis}</p>
                <p className="text-xs text-muted-foreground">
                  {visit.chief_complaint} · {new Date(visit.visit_date).toLocaleDateString("en-IN")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-border p-4">
        <h2 className="text-sm font-semibold text-foreground">Vitals</h2>
        <VitalsForm onSubmit={(values) => setVitals(values)} />
        {vitals && <p className="text-xs text-success">Vitals captured for this visit.</p>}
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-border p-4">
        <h2 className="text-sm font-semibold text-foreground">Diagnosis</h2>

        <div className="flex flex-col gap-1">
          <label htmlFor="chief_complaint" className="text-sm font-medium text-foreground">
            Chief Complaint
          </label>
          <textarea
            id="chief_complaint"
            value={chiefComplaint}
            onChange={(event) => setChiefComplaint(event.target.value)}
            className={inputClass}
            rows={2}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="diagnosis" className="text-sm font-medium text-foreground">
            Diagnosis
          </label>
          <textarea
            id="diagnosis"
            value={diagnosis}
            onChange={(event) => setDiagnosis(event.target.value)}
            className={inputClass}
            rows={2}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="doctor_notes" className="text-sm font-medium text-foreground">
            Doctor&apos;s Notes (optional)
          </label>
          <textarea
            id="doctor_notes"
            value={doctorNotes}
            onChange={(event) => setDoctorNotes(event.target.value)}
            className={inputClass}
            rows={2}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="follow_up_date" className="text-sm font-medium text-foreground">
            Follow-up Date (optional)
          </label>
          <input
            id="follow_up_date"
            type="date"
            value={followUpDate}
            onChange={(event) => setFollowUpDate(event.target.value)}
            className={inputClass}
          />
        </div>

        {visitError && <p className="text-sm text-destructive">{visitError}</p>}

        <button
          type="button"
          onClick={handleSaveVisit}
          disabled={savingVisit || Boolean(visitId) || !chiefComplaint || !diagnosis}
          className="w-fit rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {visitId ? "Visit Saved" : "Save Visit"}
        </button>
      </section>

      {visitId && (
        <section className="flex flex-col gap-4 rounded-lg border border-border p-4">
          <h2 className="text-sm font-semibold text-foreground">Prescription</h2>

          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-2 gap-2 border-b border-border pb-3 sm:grid-cols-5">
              <input
                aria-label="Medicine"
                placeholder="Medicine"
                value={item.medicine_name}
                onChange={(event) => updateItem(index, "medicine_name", event.target.value)}
                className={inputClass}
              />
              <input
                aria-label="Dosage"
                placeholder="Dosage (e.g. 500 mg)"
                value={item.dosage}
                onChange={(event) => updateItem(index, "dosage", event.target.value)}
                className={inputClass}
              />
              <input
                aria-label="Frequency"
                placeholder="Frequency (1-0-1)"
                value={item.frequency}
                onChange={(event) => updateItem(index, "frequency", event.target.value)}
                className={inputClass}
              />
              <input
                aria-label="Duration"
                placeholder="Duration (5 Days)"
                value={item.duration}
                onChange={(event) => updateItem(index, "duration", event.target.value)}
                className={inputClass}
              />
              <div className="flex gap-2">
                <input
                  aria-label="Intake instructions"
                  placeholder="After food"
                  value={item.intake_instructions}
                  onChange={(event) => updateItem(index, "intake_instructions", event.target.value)}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="text-xs text-destructive underline"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          <button type="button" onClick={addItem} className="w-fit text-sm text-primary underline">
            + Add medicine
          </button>

          <div className="flex flex-col gap-1">
            <label htmlFor="rx_instructions" className="text-sm font-medium text-foreground">
              Instructions (optional)
            </label>
            <textarea
              id="rx_instructions"
              value={prescriptionInstructions}
              onChange={(event) => setPrescriptionInstructions(event.target.value)}
              className={inputClass}
              rows={2}
            />
          </div>

          {prescriptionError && <p className="text-sm text-destructive">{prescriptionError}</p>}

          {prescriptionSaved ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-success">
                Prescription saved. This patient is ready for billing at reception.
              </p>
              <Link
                href="/doctor/dashboard"
                className="w-fit rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                Back to Queue
              </Link>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSavePrescription}
              disabled={savingPrescription}
              className="w-fit rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              Save Prescription
            </button>
          )}
        </section>
      )}
    </main>
  );
}

export default function ConsultPage() {
  return (
    <Suspense fallback={null}>
      <ConsultPageContent />
    </Suspense>
  );
}
