"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { BillingSummary } from "@/components/billing/BillingSummary";
import { API_BASE_URL } from "@/lib/api";
import { useRequireAuth } from "@/lib/use-require-auth";

const BILLING_ROLES = ["SUPER_ADMIN", "ADMIN", "RECEPTIONIST"];
const CATEGORIES = ["CONSULTATION", "PHARMACY", "LAB", "PROCEDURE", "ROOM", "OTHER"];

interface LineItemInput {
  description: string;
  category: string;
  unit_price: string;
}

const EMPTY_LINE_ITEM: LineItemInput = { description: "", category: CATEGORIES[0], unit_price: "" };

interface InvoiceResult {
  invoice_id: string;
  gross_amount: string;
  discount_amount: string;
  net_amount: string;
  items: {
    description: string;
    category: string;
    unit_price: string;
    discount_pct: string;
    final_price: string;
  }[];
}

const inputClass =
  "rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

function BillingInvoicesPageContent() {
  const { token } = useRequireAuth(BILLING_ROLES);
  const searchParams = useSearchParams();

  const patientId = searchParams.get("patientId");
  const visitId = searchParams.get("visitId");
  const patientName = searchParams.get("patientName") ?? "Patient";

  const [lineItems, setLineItems] = useState<LineItemInput[]>([{ ...EMPTY_LINE_ITEM }]);
  const [invoice, setInvoice] = useState<InvoiceResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateLineItem(index: number, field: keyof LineItemInput, value: string) {
    setLineItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }

  function addLineItem() {
    setLineItems((prev) => [...prev, { ...EMPTY_LINE_ITEM }]);
  }

  function removeLineItem(index: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleGenerateInvoice() {
    if (!patientId) return;
    setError(null);
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/billing/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          patient_id: patientId,
          visit_id: visitId || undefined,
          items: lineItems
            .filter((item) => item.description.trim().length > 0 && item.unit_price)
            .map((item) => ({
              description: item.description,
              category: item.category,
              unit_price: item.unit_price,
            })),
        }),
      });
      if (!response.ok) throw new Error("Failed to generate invoice");
      const data: InvoiceResult = await response.json();
      setInvoice(data);
    } catch {
      setError("Could not generate the invoice. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!token) {
    return null;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{patientName}</h1>
        <p className="text-sm text-muted-foreground">Billing</p>
      </div>

      {!invoice && (
        <section className="flex flex-col gap-4 rounded-lg border border-border p-4">
          <h2 className="text-sm font-semibold text-foreground">Line Items</h2>

          {lineItems.map((item, index) => (
            <div key={index} className="grid grid-cols-2 gap-2 border-b border-border pb-3 sm:grid-cols-4">
              <input
                aria-label="Description"
                placeholder="Description"
                value={item.description}
                onChange={(event) => updateLineItem(index, "description", event.target.value)}
                className={inputClass}
              />
              <select
                aria-label="Category"
                value={item.category}
                onChange={(event) => updateLineItem(index, "category", event.target.value)}
                className={inputClass}
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <input
                aria-label="Unit Price"
                type="number"
                step="0.01"
                placeholder="Unit Price"
                value={item.unit_price}
                onChange={(event) => updateLineItem(index, "unit_price", event.target.value)}
                className={inputClass}
              />
              <button type="button" onClick={() => removeLineItem(index)} className="text-xs text-destructive underline">
                Remove
              </button>
            </div>
          ))}

          <button type="button" onClick={addLineItem} className="w-fit text-sm text-primary underline">
            + Add line item
          </button>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="button"
            onClick={handleGenerateInvoice}
            disabled={saving}
            className="w-fit rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            Generate Invoice
          </button>
        </section>
      )}

      {invoice && (
        <BillingSummary
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
      )}
    </main>
  );
}

export default function BillingInvoicesPage() {
  return (
    <Suspense fallback={null}>
      <BillingInvoicesPageContent />
    </Suspense>
  );
}
