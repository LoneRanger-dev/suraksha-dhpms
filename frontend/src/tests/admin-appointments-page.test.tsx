import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
}));

import AdminAppointmentsPage from "@/app/admin/appointments/page";
import { useAuthStore } from "@/lib/auth-store";

describe("AdminAppointmentsPage", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    useAuthStore.setState({
      token: "admin-token",
      role: "SUPER_ADMIN",
      phone: "+919876500099",
      doctorId: null,
      doctorFullName: null,
    });
  });

  it("redirects to login when there is no session", () => {
    useAuthStore.setState({ token: null, role: null, phone: null, doctorId: null, doctorFullName: null });
    render(<AdminAppointmentsPage />);
    expect(replaceMock).toHaveBeenCalledWith("/login");
  });

  it("lists today's appointments across every department", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            appointment_id: "a1",
            patient_id: "p1",
            patient_display_id: "SUR-2026-000700",
            patient_full_name: "Appt Patient",
            doctor_id: "d1",
            doctor_full_name: "Dr. Anjali Rao",
            token_number: "GENERA-001",
            time_slot: "09:15",
            appointment_date: "2026-08-20",
            status: "SCHEDULED",
          },
        ],
      })
    );

    render(<AdminAppointmentsPage />);

    expect(await screen.findByText("Appt Patient")).toBeInTheDocument();
    expect(screen.getByText("GENERA-001")).toBeInTheDocument();

    const billingLink = screen.getByRole("link", { name: /^billing$/i });
    expect(billingLink.getAttribute("href")).toBe("/admin/billing");
  });
});
