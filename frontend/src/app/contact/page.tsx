import Link from "next/link";

export default function ContactPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-foreground">Contact Us</h1>
        <p className="text-muted-foreground">Suraksha Super Specialty Hospital — Care & Compassion Driven.</p>
      </div>

      <div className="flex flex-col gap-4 rounded-lg border border-border p-6">
        <div>
          <p className="text-sm font-semibold text-foreground">24x7 Emergency</p>
          <p className="text-sm text-muted-foreground">+91 800-555-0199</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Reception Desk</p>
          <p className="text-sm text-muted-foreground">+91 800-555-0100 · Open 7:00 AM – 10:00 PM</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Email</p>
          <p className="text-sm text-muted-foreground">care@suraksha-dhpms.example</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Address</p>
          <p className="text-sm text-muted-foreground">
            Suraksha Super Specialty Hospital, 1 Health Avenue, Hyderabad, Telangana 500032
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/register" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          Register a Patient
        </Link>
        <Link href="/membership-plans" className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground">
          View Membership Plans
        </Link>
      </div>
    </main>
  );
}
