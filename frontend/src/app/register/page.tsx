"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { API_BASE_URL } from "@/lib/api";

const registrationSchema = z.object({
  full_name: z.string().min(1, "Full name is required."),
  dob: z.string().min(1, "Date of birth is required."),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, "Enter a valid 10-digit mobile number."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  emergency_contact_phone: z
    .string()
    .regex(/^\+?[1-9]\d{9,14}$/, "Enter a valid 10-digit mobile number."),
  blood_group: z.string().optional(),
  plan_id: z.string().min(1, "Select a membership plan."),
});

type RegistrationFormValues = z.infer<typeof registrationSchema>;

interface MembershipPlanOption {
  plan_id: string;
  name: string;
  tier: string;
}

interface RegisteredPatient {
  patient_id: string;
  patient_display_id: string;
  full_name: string;
  qr_card: { card_id: string; status: string };
}

const inputClass =
  "rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export default function RegisterPage() {
  const [plans, setPlans] = useState<MembershipPlanOption[]>([]);
  const [registered, setRegistered] = useState<RegisteredPatient | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: { gender: "MALE", plan_id: "" },
  });

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/v1/membership-plans`)
      .then((res) => res.json())
      .then((data: MembershipPlanOption[]) => {
        setPlans(data);
        if (data.length > 0) {
          setValue("plan_id", data[0].plan_id);
        }
      })
      .catch(() => setPlans([]));
  }, [setValue]);

  const onSubmit = async (values: RegistrationFormValues) => {
    setSubmitError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/patients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!response.ok) {
        throw new Error("Registration failed");
      }
      const patient: RegisteredPatient = await response.json();
      setRegistered(patient);
    } catch {
      setSubmitError("Something went wrong while registering. Please try again.");
    }
  };

  if (registered) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Registration complete</h1>
        <p className="font-semibold text-success">{registered.patient_display_id}</p>
        <p className="text-sm text-muted-foreground">
          {registered.full_name}&apos;s health card is ready. Card status: {registered.qr_card.status}.
        </p>
        <div className="mt-2 flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              setRegistered(null);
              reset({ gender: "MALE", plan_id: plans[0]?.plan_id ?? "" });
            }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Register Another Patient
          </button>
          <Link href="/" className="text-sm text-muted-foreground underline">
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold text-foreground">Register</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <Field label="Full Name" htmlFor="full_name" error={errors.full_name?.message}>
          <input id="full_name" className={inputClass} {...register("full_name")} />
        </Field>

        <Field label="Date of Birth" htmlFor="dob" error={errors.dob?.message}>
          <input id="dob" type="date" className={inputClass} {...register("dob")} />
        </Field>

        <Field label="Gender" htmlFor="gender" error={errors.gender?.message}>
          <select id="gender" className={inputClass} {...register("gender")}>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
        </Field>

        <Field label="Phone Number (used to log in)" htmlFor="phone" error={errors.phone?.message}>
          <input
            id="phone"
            placeholder="e.g., +91 98765 43210"
            className={inputClass}
            {...register("phone")}
          />
        </Field>

        <Field label="Password" htmlFor="password" error={errors.password?.message}>
          <input id="password" type="password" className={inputClass} {...register("password")} />
        </Field>

        <Field label="Blood Group" htmlFor="blood_group" error={errors.blood_group?.message}>
          <input id="blood_group" placeholder="e.g. B+" className={inputClass} {...register("blood_group")} />
        </Field>

        <Field
          label="Emergency Contact Phone"
          htmlFor="emergency_contact_phone"
          error={errors.emergency_contact_phone?.message}
        >
          <input
            id="emergency_contact_phone"
            placeholder="e.g., +91 98765 43210"
            className={inputClass}
            {...register("emergency_contact_phone")}
          />
        </Field>

        <Field label="Membership Plan" htmlFor="plan_id" error={errors.plan_id?.message}>
          <select id="plan_id" className={inputClass} {...register("plan_id")}>
            {plans.length === 0 && <option value="">Loading plans…</option>}
            {plans.map((plan) => (
              <option key={plan.plan_id} value={plan.plan_id}>
                {plan.name} ({plan.tier})
              </option>
            ))}
          </select>
        </Field>

        {submitError && <p className="text-sm text-destructive">{submitError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          Register
        </button>
      </form>
    </main>
  );
}
