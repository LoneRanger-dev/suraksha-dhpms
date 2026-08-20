"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { API_BASE_URL } from "@/lib/api";
import { useRequireAuth } from "@/lib/use-require-auth";

interface InvoiceItem {
  invoice_id: string;
  patient_display_id: string;
  patient_full_name: string;
  gross_amount: string;
  discount_amount: string;
  net_amount: string;
  status: string;
  created_at: string;
}

interface Summary {
  invoice_count: number;
  total_gross: string;
  total_discount: string;
  total_net: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(
    value
  );
}

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

export default function AdminBillingPage() {
  const { token } = useRequireAuth(ADMIN_ROLES);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      fetch(`${API_BASE_URL}/api/v1/billing/summary`, { headers: { Authorization: `Bearer ${token}` } }).then(
        (res) => (res.ok ? res.json() : null)
      ),
      fetch(`${API_BASE_URL}/api/v1/billing/invoices`, { headers: { Authorization: `Bearer ${token}` } }).then(
        (res) => (res.ok ? res.json() : [])
      ),
    ])
      .then(([summaryData, invoiceData]) => {
        setSummary(summaryData);
        setInvoices(Array.isArray(invoiceData) ? invoiceData : []);
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (!token) {
    return null;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Billing & Reports</h1>
        <div className="flex items-center gap-3">
          <Link href="/admin/doctors" className="text-sm text-muted-foreground underline">
            Doctors & Departments
          </Link>
          <Link href="/admin/audit-logs" className="text-sm text-muted-foreground underline">
            Audit Logs
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          {summary && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg border border-border p-4">
                <p className="text-xs text-muted-foreground">Invoices</p>
                <p className="text-lg font-semibold text-foreground">{summary.invoice_count} invoices</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-xs text-muted-foreground">Gross Revenue</p>
                <p className="text-lg font-semibold text-foreground">{formatCurrency(Number(summary.total_gross))}</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-xs text-muted-foreground">Discounts Given</p>
                <p className="text-lg font-semibold text-success">
                  {formatCurrency(Number(summary.total_discount))}
                </p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-xs text-muted-foreground">Net Revenue</p>
                <p className="text-lg font-semibold text-foreground">{formatCurrency(Number(summary.total_net))}</p>
              </div>
            </div>
          )}

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-foreground">All Invoices</h2>
            {invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No invoices yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {invoices.map((invoice) => (
                  <li
                    key={invoice.invoice_id}
                    className="flex items-center justify-between rounded-md border border-border p-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">{invoice.patient_full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {invoice.patient_display_id} · {new Date(invoice.created_at).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">
                        {formatCurrency(Number(invoice.net_amount))}
                      </p>
                      <span className="text-xs text-muted-foreground">{invoice.status}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
