import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
}));

import ReceptionQueuePage from "@/app/(staff)/reception/queue/page";
import { useAuthStore } from "@/lib/auth-store";

describe("ReceptionQueuePage", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    useAuthStore.setState({
      token: "staff-token",
      role: "RECEPTIONIST",
      phone: "+919876500099",
      doctorId: null,
      doctorFullName: null,
    });
  });

  it("redirects to login when there is no session", () => {
    useAuthStore.setState({ token: null, role: null, phone: null, doctorId: null, doctorFullName: null });
    render(<ReceptionQueuePage />);
    expect(replaceMock).toHaveBeenCalledWith("/login");
  });

  it("shows today's queue tokens grouped by status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            appointment_id: "a1",
            patient_id: "p1",
            patient_display_id: "SUR-2026-000700",
            patient_full_name: "Queue Patient",
            doctor_id: "d1",
            doctor_full_name: "Dr. Anjali Rao",
            token_number: "CARDIO-001",
            time_slot: "09:15",
            appointment_date: "2026-08-20",
            status: "CHECKED_IN",
          },
        ],
      })
    );

    render(<ReceptionQueuePage />);

    expect(await screen.findByText("CARDIO-001")).toBeInTheDocument();
    expect(screen.getByText("Queue Patient")).toBeInTheDocument();
    expect(screen.getByText(/Dr\. Anjali Rao/)).toBeInTheDocument();

    const scannerLink = screen.getByRole("link", { name: /scanner/i });
    expect(scannerLink.getAttribute("href")).toBe("/reception/scanner");
  });
});
