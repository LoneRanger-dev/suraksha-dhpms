import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
}));

import DoctorDashboardPage from "@/app/(staff)/doctor/dashboard/page";
import { useAuthStore } from "@/lib/auth-store";

describe("DoctorDashboardPage", () => {
  beforeEach(() => {
    replaceMock.mockReset();
  });

  it("redirects to login when there is no session", () => {
    useAuthStore.setState({ token: null, role: null, phone: null, doctorId: null, doctorFullName: null });
    render(<DoctorDashboardPage />);
    expect(replaceMock).toHaveBeenCalledWith("/login");
  });

  it("renders the today's appointments heading and an empty-queue state", async () => {
    useAuthStore.setState({
      token: "doc-token",
      role: "DOCTOR",
      phone: "+919876500001",
      doctorId: "d1",
      doctorFullName: "Dr. Test",
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));

    render(<DoctorDashboardPage />);

    expect(screen.getByRole("heading", { name: /today's appointments/i })).toBeInTheDocument();
    expect(await screen.findByText(/no appointments scheduled/i)).toBeInTheDocument();
  });

  it("lists a checked-in patient and links to their consultation", async () => {
    useAuthStore.setState({
      token: "doc-token",
      role: "DOCTOR",
      phone: "+919876500001",
      doctorId: "d1",
      doctorFullName: "Dr. Test",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            appointment_id: "a1",
            patient_id: "p1",
            patient_display_id: "SUR-2026-000900",
            patient_full_name: "Consult Patient",
            token_number: "CARDIO-001",
            time_slot: "10:30",
            status: "CHECKED_IN",
          },
        ],
      })
    );

    render(<DoctorDashboardPage />);

    expect(await screen.findByText("Consult Patient")).toBeInTheDocument();
    expect(screen.getByText(/CARDIO-001/)).toBeInTheDocument();
    const openLink = screen.getByRole("link", { name: /open/i });
    expect(openLink.getAttribute("href")).toContain("appointmentId=a1");
    expect(openLink.getAttribute("href")).toContain("patientId=p1");
  });
});
