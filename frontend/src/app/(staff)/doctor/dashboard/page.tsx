import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DoctorDashboardPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold text-foreground">Today&apos;s Appointments</h1>

      <Card>
        <CardHeader>
          <CardTitle>Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No appointments scheduled yet. Patients checked in by reception will appear here.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
