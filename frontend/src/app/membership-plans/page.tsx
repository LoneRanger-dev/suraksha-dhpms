"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { API_BASE_URL } from "@/lib/api";

interface PlanItem {
  plan_id: string;
  name: string;
  tier: string;
  price: string;
  validity_days: number;
  consultation_discount_pct: string;
  lab_discount_pct: string;
  pharmacy_discount_pct: string;
}

const TIER_ACCENT: Record<string, string> = {
  FREE: "border-border",
  SILVER: "border-slate-400",
  GOLD: "border-primary",
  PLATINUM: "border-secondary-foreground",
};

export default function MembershipPlansPage() {
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/v1/membership-plans`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setPlans(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-foreground">Membership Plans</h1>
        <p className="text-muted-foreground">
          Every plan includes a digital health card and QR check-in. Higher tiers add bigger discounts across
          consultations, lab tests, and pharmacy.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <div
              key={plan.plan_id}
              className={`flex flex-col gap-4 rounded-xl border-2 p-6 ${TIER_ACCENT[plan.tier] ?? "border-border"}`}
            >
              <div>
                <span className="text-xs font-semibold uppercase tracking-wide text-primary">{plan.tier}</span>
                <h2 className="text-lg font-semibold text-foreground">{plan.name}</h2>
              </div>
              <p className="text-2xl font-bold text-foreground">
                ₹{Number(plan.price).toLocaleString("en-IN")}
                <span className="text-sm font-normal text-muted-foreground">
                  {" "}
                  / {plan.validity_days} days
                </span>
              </p>
              <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                <li>{Number(plan.consultation_discount_pct)}% off consultations</li>
                <li>{Number(plan.lab_discount_pct)}% off lab tests</li>
                <li>{Number(plan.pharmacy_discount_pct)}% off pharmacy</li>
              </ul>
              <Link
                href="/register"
                className="mt-auto w-fit rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                Register with this plan
              </Link>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
