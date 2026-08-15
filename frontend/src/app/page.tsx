import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const JOURNEY = [
  {
    step: "01",
    title: "Register",
    body: "One form captures identity, family, and medical history. A Universal Patient ID and QR health card are issued the moment it's saved.",
    href: "/register",
    cta: "Register a patient",
  },
  {
    step: "02",
    title: "Scan",
    body: "Reception scans the card. The full profile, membership status, and any allergy alerts resolve before the patient sits down.",
    href: "/reception/scanner",
    cta: "Open the scanner",
  },
  {
    step: "03",
    title: "Consult",
    body: "The doctor opens the case with history already on screen — vitals, diagnosis, and e-prescription in one workspace.",
    href: "/doctor/dashboard",
    cta: "Open doctor view",
  },
] as const;

const MODULES = [
  {
    label: "Identity",
    title: "QR health card",
    body: "A non-guessable token, not a plaintext record — the card identifies, it doesn't expose.",
  },
  {
    label: "Front desk",
    title: "10-second check-in",
    body: "No name lookups, no repeated forms. Scan resolves the full patient record instantly.",
  },
  {
    label: "Clinical",
    title: "Consult & e-prescribe",
    body: "Vitals, diagnosis, and dosage-checked prescriptions, with prior visit history one click away.",
  },
  {
    label: "Billing",
    title: "Membership discounts",
    body: "Tier pricing applied automatically across consultation, lab, and pharmacy line items.",
  },
] as const;

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <span className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-foreground">
            Suraksha DHPMS
          </span>
          <nav className="flex items-center gap-2">
            <Link href="/reception/scanner" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
              Reception
            </Link>
            <Link href="/doctor/dashboard" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
              Doctor
            </Link>
            <Link href="/register" className={cn(buttonVariants({ variant: "default", size: "sm" }))}>
              Register
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 md:grid-cols-[1.1fr_1fr] md:items-center md:py-28">
          <div className="flex flex-col gap-6">
            <span className="w-fit rounded-full border border-border bg-secondary px-3 py-1 font-[family-name:var(--font-mono)] text-xs tracking-wide text-muted-foreground uppercase">
              Digital Hospital Patient Management
            </span>
            <h1 className="font-[family-name:var(--font-display)] text-4xl leading-[1.05] font-semibold tracking-tight text-foreground sm:text-5xl">
              Check-in in under
              <br />
              10 seconds, not 10 forms.
            </h1>
            <p className="max-w-md text-base leading-relaxed text-muted-foreground">
              One QR health card carries identity, medical history, and membership status. Reception scans it,
              doctors consult from it, billing discounts apply themselves.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link href="/register" className={cn(buttonVariants({ variant: "default", size: "lg" }), "px-6")}>
                Register a patient
              </Link>
              <Link
                href="/reception/scanner"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "px-6")}
              >
                See the scanner
              </Link>
            </div>
          </div>

          {/* Signature: the physical health card, rendered as the hero artifact */}
          <div className="flex justify-center md:justify-end">
            <div className="aspect-[85.6/53.98] w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-slate-900/10">
              <div className="flex items-center justify-between bg-primary px-4 py-2.5 text-primary-foreground">
                <span className="font-[family-name:var(--font-display)] text-[11px] font-semibold tracking-wide uppercase">
                  Suraksha Hospital
                </span>
                <span className="rounded-full bg-success px-2 py-0.5 font-[family-name:var(--font-mono)] text-[9px] font-semibold text-success-foreground">
                  Gold Member
                </span>
              </div>
              <div className="flex gap-4 p-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-dashed border-border bg-muted">
                  <svg viewBox="0 0 64 64" className="h-12 w-12 text-muted-foreground" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M8 8h16v16H8V8Zm4 4v8h8v-8h-8Zm28-4h16v16H40V8Zm4 4v8h8v-8h-8ZM8 40h16v16H8V40Zm4 4v8h8v-8h-8Zm32-4h6v6h-6v-6Zm10 0h6v6h-6v-6Zm-10 10h6v6h-6v-6Zm10 0h6v6h-6v-6Z"
                    />
                  </svg>
                </div>
                <div className="flex flex-col gap-1 text-foreground">
                  <span className="text-sm font-semibold">Manvith M N</span>
                  <span className="font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground">
                    SUR-2026-0001245
                  </span>
                  <span className="text-[11px] text-muted-foreground">DOB 04/09/2005 · Male</span>
                  <span className="text-[11px] text-muted-foreground">Blood Group B+ · Valid thru 08/2027</span>
                  <span className="text-[11px] font-semibold text-destructive">Allergies: Penicillin</span>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
                <span>24×7 Emergency: +91 800-555-0199</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Patient journey — real sequence, so numbering earns its place */}
      <section className="border-b border-border bg-secondary/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-12 flex flex-col gap-2">
            <span className="font-[family-name:var(--font-mono)] text-xs tracking-wide text-primary uppercase">
              The patient journey
            </span>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Three screens. One record.
            </h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {JOURNEY.map((item) => (
              <div key={item.step} className="flex flex-col gap-3 border-t-2 border-primary pt-5">
                <span className="font-[family-name:var(--font-mono)] text-sm text-muted-foreground">
                  {item.step}
                </span>
                <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                <Link
                  href={item.href}
                  className="mt-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  {item.cta} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Module strip */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="mb-10 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            What&apos;s running underneath
          </h2>
          <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            {MODULES.map((mod) => (
              <div key={mod.title} className="flex flex-col gap-2 bg-card p-6">
                <span className="font-[family-name:var(--font-mono)] text-[11px] tracking-wide text-primary uppercase">
                  {mod.label}
                </span>
                <h3 className="font-[family-name:var(--font-display)] text-base font-semibold text-foreground">
                  {mod.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{mod.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-6 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>Suraksha DHPMS</span>
        <span>Digital Hospital Patient Management System</span>
      </footer>
    </div>
  );
}
