import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
  useParams: () => ({ token: "64a69c0c-e706-4569-b25c-7567a6a2b2bc" }),
}));

import PublicScanPage from "@/app/scan/[token]/page";
import { useAuthStore } from "@/lib/auth-store";

describe("PublicScanPage", () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, role: null, phone: null, doctorId: null, doctorFullName: null });
  });

  it("shows the restricted emergency view for an unauthenticated visitor", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) => {
        expect(init?.headers).toEqual({});
        return Promise.resolve({
          ok: true,
          json: async () => ({
            full_name: "Scan Test Patient",
            blood_group: "B+",
            allergies: "Penicillin",
            emergency_contact_phone: "+919876500099",
          }),
        });
      })
    );

    render(<PublicScanPage />);

    expect(await screen.findByText("Scan Test Patient")).toBeInTheDocument();
    expect(screen.getByText("B+")).toBeInTheDocument();
    expect(screen.getByText(/Penicillin/)).toBeInTheDocument();
    expect(screen.queryByText(/membership/i)).not.toBeInTheDocument();
  });

  it("shows the full staff dossier when a staff session is active", async () => {
    useAuthStore.setState({
      token: "staff-token",
      role: "RECEPTIONIST",
      phone: "+919876500099",
      doctorId: null,
      doctorFullName: null,
    });

    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) => {
        expect((init?.headers as Record<string, string>)?.Authorization).toBe("Bearer staff-token");
        return Promise.resolve({
          ok: true,
          json: async () => ({
            patient_id: "p1",
            patient_display_id: "SUR-2026-000500",
            full_name: "Scan Test Patient",
            dob: "1990-01-01",
            gender: "MALE",
            blood_group: "B+",
            allergies: "Penicillin",
            membership_tier: "GOLD",
            card_status: "ACTIVE",
          }),
        });
      })
    );

    render(<PublicScanPage />);

    expect(await screen.findByText("SUR-2026-000500")).toBeInTheDocument();
    expect(screen.getByText(/GOLD/)).toBeInTheDocument();

    const scannerLink = screen.getByRole("link", { name: /open in scanner/i });
    expect(scannerLink.getAttribute("href")).toBe("/reception/scanner");
  });

  it("shows a not-found message for an invalid token", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));

    render(<PublicScanPage />);

    expect(await screen.findByText(/invalid or expired/i)).toBeInTheDocument();
  });
});
