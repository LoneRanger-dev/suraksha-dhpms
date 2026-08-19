"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { API_BASE_URL } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

const loginSchema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, "Enter a valid 10-digit mobile number."),
  password: z.string().min(1, "Password is required."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const inputClass =
  "rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

const ROLE_DESTINATIONS: Record<string, string> = {
  RECEPTIONIST: "/reception/scanner",
  ADMIN: "/reception/scanner",
  SUPER_ADMIN: "/reception/scanner",
  NURSE: "/reception/scanner",
  DOCTOR: "/doctor/dashboard",
  PATIENT: "/patient/dashboard",
  PHARMACIST: "/pharmacy/dispense",
};

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginFormValues) => {
    setFormError(null);
    try {
      const loginResponse = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!loginResponse.ok) {
        const body = await loginResponse.json().catch(() => null);
        setFormError(body?.detail ?? "Invalid phone or password");
        return;
      }

      const { access_token: token, role } = await loginResponse.json();

      const meResponse = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const me = meResponse.ok ? await meResponse.json() : null;

      setSession({
        token,
        role,
        phone: values.phone,
        doctorId: me?.doctor_id ?? null,
        doctorFullName: me?.doctor_full_name ?? null,
      });

      router.push(ROLE_DESTINATIONS[role] ?? "/");
    } catch {
      setFormError("Couldn't reach the server. Please try again.");
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-foreground">Log In</h1>
        <p className="text-sm text-muted-foreground">Patients, reception, nursing, and doctor access.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1">
          <label htmlFor="phone" className="text-sm font-medium text-foreground">
            Phone Number
          </label>
          <input id="phone" placeholder="+91 98765 43210" className={inputClass} {...register("phone")} />
          {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Password
          </label>
          <input id="password" type="password" className={inputClass} {...register("password")} />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        {formError && <p className="text-sm text-destructive">{formError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          Log in
        </button>
      </form>
    </main>
  );
}
