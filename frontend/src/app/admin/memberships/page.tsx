"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { API_BASE_URL } from "@/lib/api";
import { useRequireAuth } from "@/lib/use-require-auth";

interface PlanItem {
  plan_id: string;
  name: string;
  tier: string;
}

const TIERS = ["FREE", "SILVER", "GOLD", "PLATINUM"];

const inputClass =
  "rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

export default function AdminMembershipsPage() {
  const { token } = useRequireAuth(ADMIN_ROLES);
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [tier, setTier] = useState(TIERS[1]);
  const [price, setPrice] = useState("");
  const [validityDays, setValidityDays] = useState("365");
  const [consultationDiscount, setConsultationDiscount] = useState("0");
  const [labDiscount, setLabDiscount] = useState("0");
  const [pharmacyDiscount, setPharmacyDiscount] = useState("0");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE_URL}/api/v1/membership-plans`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setPlans(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleAddPlan(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/membership-plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name,
          tier,
          price,
          validity_days: Number(validityDays),
          consultation_discount_pct: consultationDiscount,
          lab_discount_pct: labDiscount,
          pharmacy_discount_pct: pharmacyDiscount,
        }),
      });
      if (!response.ok) throw new Error("Failed to add plan");
      const plan: PlanItem = await response.json();
      setPlans((prev) => [...prev, plan]);
      setName("");
      setPrice("");
      setConsultationDiscount("0");
      setLabDiscount("0");
      setPharmacyDiscount("0");
    } catch {
      setError("Could not add this membership plan.");
    } finally {
      setSaving(false);
    }
  }

  if (!token) {
    return null;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Membership Plans</h1>
        <Link href="/admin/doctors" className="text-sm text-muted-foreground underline">
          Doctors & Departments
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : plans.length === 0 ? (
        <p className="text-sm text-muted-foreground">No membership plans yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {plans.map((plan) => (
            <li key={plan.plan_id} className="rounded-md border border-border p-3">
              <p className="text-sm font-semibold text-foreground">{plan.name}</p>
              <p className="text-xs text-muted-foreground">{plan.tier}</p>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAddPlan} className="flex flex-col gap-4 rounded-lg border border-border p-4">
        <h2 className="text-sm font-semibold text-foreground">Add a Membership Plan</h2>

        <div className="flex flex-col gap-1">
          <label htmlFor="plan_name" className="text-sm font-medium text-foreground">
            Plan Name
          </label>
          <input id="plan_name" value={name} onChange={(event) => setName(event.target.value)} className={inputClass} required />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="plan_tier" className="text-sm font-medium text-foreground">
            Tier
          </label>
          <select id="plan_tier" value={tier} onChange={(event) => setTier(event.target.value)} className={inputClass}>
            {TIERS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="plan_price" className="text-sm font-medium text-foreground">
              Price (₹)
            </label>
            <input
              id="plan_price"
              type="number"
              step="0.01"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="plan_validity" className="text-sm font-medium text-foreground">
              Validity (Days)
            </label>
            <input
              id="plan_validity"
              type="number"
              value={validityDays}
              onChange={(event) => setValidityDays(event.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="plan_consult_discount" className="text-sm font-medium text-foreground">
              Consultation Discount (%)
            </label>
            <input
              id="plan_consult_discount"
              type="number"
              step="0.01"
              value={consultationDiscount}
              onChange={(event) => setConsultationDiscount(event.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="plan_lab_discount" className="text-sm font-medium text-foreground">
              Lab Discount (%)
            </label>
            <input
              id="plan_lab_discount"
              type="number"
              step="0.01"
              value={labDiscount}
              onChange={(event) => setLabDiscount(event.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="plan_pharmacy_discount" className="text-sm font-medium text-foreground">
              Pharmacy Discount (%)
            </label>
            <input
              id="plan_pharmacy_discount"
              type="number"
              step="0.01"
              value={pharmacyDiscount}
              onChange={(event) => setPharmacyDiscount(event.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-fit rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          Add Plan
        </button>
      </form>
    </main>
  );
}
