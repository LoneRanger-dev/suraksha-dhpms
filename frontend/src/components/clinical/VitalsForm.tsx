"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { type Resolver, useForm } from "react-hook-form";
import { z } from "zod";

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

const vitalsSchema = z.object({
  bp: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .regex(/^\d{2,3}\/\d{2,3}$/, "Enter systolic/diastolic format (e.g., 120/80).")
      .optional()
  ),
  pulse: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().optional()),
  temp_f: z.preprocess(emptyToUndefined, z.coerce.number().positive().optional()),
  spo2: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).max(100).optional()),
  weight_kg: z.preprocess(emptyToUndefined, z.coerce.number().positive().optional()),
  height_cm: z.preprocess(emptyToUndefined, z.coerce.number().positive().optional()),
});

export type VitalsFormValues = z.infer<typeof vitalsSchema>;

interface VitalsFormProps {
  onSubmit: (values: VitalsFormValues) => void;
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

export function VitalsForm({ onSubmit }: VitalsFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<VitalsFormValues>({ resolver: zodResolver(vitalsSchema) as Resolver<VitalsFormValues> });

  const weight = watch("weight_kg");
  const height = watch("height_cm");

  const bmi = useMemo(() => {
    if (!weight || !height) return null;
    const heightM = height / 100;
    return weight / (heightM * heightM);
  }, [weight, height]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Blood Pressure" htmlFor="bp" error={errors.bp?.message}>
          <input id="bp" placeholder="120/80" className={inputClass} {...register("bp")} />
        </Field>
        <Field label="Heart Rate" htmlFor="pulse" error={errors.pulse?.message}>
          <input id="pulse" type="number" className={inputClass} {...register("pulse")} />
        </Field>
        <Field label="Temperature (°F)" htmlFor="temp_f" error={errors.temp_f?.message}>
          <input id="temp_f" type="number" step="0.1" className={inputClass} {...register("temp_f")} />
        </Field>
        <Field label="SpO2 (%)" htmlFor="spo2" error={errors.spo2?.message}>
          <input id="spo2" type="number" className={inputClass} {...register("spo2")} />
        </Field>
        <Field label="Weight (kg)" htmlFor="weight_kg" error={errors.weight_kg?.message}>
          <input id="weight_kg" type="number" step="0.1" className={inputClass} {...register("weight_kg")} />
        </Field>
        <Field label="Height (cm)" htmlFor="height_cm" error={errors.height_cm?.message}>
          <input id="height_cm" type="number" step="0.1" className={inputClass} {...register("height_cm")} />
        </Field>
      </div>

      {bmi !== null && <p className="text-sm text-muted-foreground">BMI: {bmi.toFixed(1)}</p>}

      <button
        type="submit"
        className="w-fit rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        Save Vitals
      </button>
    </form>
  );
}
