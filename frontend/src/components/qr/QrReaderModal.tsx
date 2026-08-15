"use client";

import { useEffect, useRef, useState } from "react";

import { API_BASE_URL } from "@/lib/api";

interface ScanResult {
  full_name: string;
  blood_group: string | null;
  allergies: string;
  emergency_contact_phone?: string;
  patient_display_id?: string;
  membership_tier?: string;
  card_status?: string;
}

interface QrReaderModalProps {
  onClose: () => void;
  authToken?: string | null;
}

const SCAN_URL_PATTERN = /\/scan\/([0-9a-fA-F-]{36})/;
const UUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function extractToken(raw: string): string | null {
  const urlMatch = raw.match(SCAN_URL_PATTERN);
  if (urlMatch) return urlMatch[1];
  const trimmed = raw.trim();
  return UUID_PATTERN.test(trimmed) ? trimmed : null;
}

export function QrReaderModal({ onClose, authToken }: QrReaderModalProps) {
  const [cameraError, setCameraError] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function lookupTokenInternal(token: string) {
      setFetchError(null);
      try {
        const headers: Record<string, string> = {};
        if (authToken) headers.Authorization = `Bearer ${authToken}`;
        const response = await fetch(`${API_BASE_URL}/api/v1/scan/${token}`, { headers });
        if (!response.ok) throw new Error("Card not found");
        const data: ScanResult = await response.json();
        if (!cancelled) setResult(data);
      } catch {
        if (!cancelled) setFetchError("Could not resolve this card. Try the manual token instead.");
      }
    }

    async function startScanner() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const scanner = new Html5Qrcode("qr-reader-region");
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 220 },
          (decodedText: string) => {
            const token = extractToken(decodedText);
            if (token) void lookupTokenInternal(token);
          },
          () => {}
        );
      } catch {
        if (!cancelled) setCameraError(true);
      }
    }

    startScanner();

    return () => {
      cancelled = true;
      scannerRef.current?.stop().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function lookupToken(token: string) {
    if (!token) return;
    setFetchError(null);
    try {
      const headers: Record<string, string> = {};
      if (authToken) headers.Authorization = `Bearer ${authToken}`;
      const response = await fetch(`${API_BASE_URL}/api/v1/scan/${token}`, { headers });
      if (!response.ok) throw new Error("Card not found");
      const data: ScanResult = await response.json();
      setResult(data);
    } catch {
      setFetchError("Could not resolve this card. Try the manual token instead.");
    }
  }

  const hasAllergies = Boolean(result?.allergies && result.allergies.trim().toUpperCase() !== "NONE");

  return (
    <div
      role="dialog"
      aria-label="Scan patient QR card"
      className="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-border bg-card p-4"
    >
      <div id="qr-reader-region" className="aspect-square w-full overflow-hidden rounded-md bg-muted" />

      {cameraError && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-warning">Camera unavailable. Enter the token manually.</p>
          <label htmlFor="manual-scan-token" className="text-sm font-medium text-foreground">
            Patient ID or Token
          </label>
          <div className="flex gap-2">
            <input
              id="manual-scan-token"
              value={manualInput}
              onChange={(event) => setManualInput(event.target.value)}
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={() => lookupToken(manualInput.trim())}
              className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
            >
              Look up
            </button>
          </div>
        </div>
      )}

      {fetchError && <p className="text-sm text-destructive">{fetchError}</p>}

      {result && (
        <div className="flex flex-col gap-2 rounded-md border border-border p-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground">{result.full_name}</span>
            {result.blood_group && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
                {result.blood_group}
              </span>
            )}
          </div>

          {result.membership_tier && (
            <span className="w-fit rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
              {result.membership_tier} Member
            </span>
          )}

          {hasAllergies && (
            <p className="rounded-md bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive">
              Allergy Alert: {result.allergies}
            </p>
          )}

          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
            >
              Generate Queue Token
            </button>
            <button
              type="button"
              className="rounded-md border border-border px-3 py-2 text-xs font-semibold text-foreground"
            >
              Direct to Doctor Consultation
            </button>
          </div>
        </div>
      )}

      <button type="button" onClick={onClose} className="self-end text-sm text-muted-foreground underline">
        Close
      </button>
    </div>
  );
}
