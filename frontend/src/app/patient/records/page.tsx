"use client";

import { useEffect, useState } from "react";

import { BillingSummary } from "@/components/billing/BillingSummary";
import { API_BASE_URL } from "@/lib/api";
import { useRequireAuth } from "@/lib/use-require-auth";

interface Visit {
  visit_id: string;
  chief_complaint: string;
  diagnosis: string;
  visit_date: string;
}

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
  instructions: string | null;
  created_at: string;
  items: PrescriptionItem[];
}

interface InvoiceItem {
  invoice_item_id: string;
  description: string;
  category: string;
  unit_price: string;
  discount_pct: string;
  final_price: string;
}

interface Invoice {
  invoice_id: string;
  gross_amount: string;
  discount_amount: string;
  net_amount: string;
  status: string;
  items: InvoiceItem[];
}

async function fetchJson<T>(url: string, token: string): Promise<T[]> {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) return [];
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

export default function PatientRecordsPage() {
  const { token } = useRequireAuth(["PATIENT"]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      fetchJson<Visit>(`${API_BASE_URL}/api/v1/patients/me/visits`, token),
      fetchJson<Prescription>(`${API_BASE_URL}/api/v1/patients/me/prescriptions`, token),
      fetchJson<Invoice>(`${API_BASE_URL}/api/v1/patients/me/invoices`, token),
    ])
      .then(([v, p, i]) => {
        setVisits(v);
        setPrescriptions(p);
        setInvoices(i);
      })
      .finally(() => setLoading(false));
  }, [token]);

  async function handleDownloadPdf(prescriptionId: string) {
    if (!token) return;
    const response = await fetch(`${API_BASE_URL}/api/v1/consultations/prescriptions/${prescriptionId}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return;
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `prescription-${prescriptionId}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!token) {
    return null;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 p-8">
      <h1 className="text-2xl font-semibold text-foreground">My Records</h1>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-foreground">Medical History</h2>
            {visits.length === 0 ? (
              <p className="text-sm text-muted-foreground">No visits recorded yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {visits.map((visit) => (
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

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-foreground">Prescriptions</h2>
            {prescriptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No prescriptions yet.</p>
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
                          {item.intake_instructions && ` (${item.intake_instructions})`}
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={() => handleDownloadPdf(rx.prescription_id)}
                      className="w-fit text-xs font-medium text-primary underline"
                    >
                      Download PDF
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-foreground">Bills</h2>
            {invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No bills yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {invoices.map((invoice) => (
                  <BillingSummary
                    key={invoice.invoice_id}
                    items={invoice.items.map((item) => ({
                      description: item.description,
                      category: item.category,
                      unitPrice: Number(item.unit_price),
                      discountPct: Number(item.discount_pct),
                      finalPrice: Number(item.final_price),
                    }))}
                    grossAmount={Number(invoice.gross_amount)}
                    discountAmount={Number(invoice.discount_amount)}
                    netAmount={Number(invoice.net_amount)}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
