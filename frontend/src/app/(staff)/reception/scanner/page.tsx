import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReceptionScannerPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Fast-Scan Check-In</h1>
        <Badge variant="outline" className="border-warning text-warning">
          Camera not started
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scan Patient QR Card</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex aspect-video items-center justify-center rounded-md border border-dashed border-border bg-muted text-sm text-muted-foreground">
            Camera preview will appear here
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="manual-token" className="text-sm font-medium text-foreground">
              Patient ID or Token
            </label>
            <input
              id="manual-token"
              name="manual-token"
              type="text"
              placeholder="e.g. SUR-2026-000847"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground">
              Use this if the camera is unavailable or the card can&apos;t be scanned.
            </p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
