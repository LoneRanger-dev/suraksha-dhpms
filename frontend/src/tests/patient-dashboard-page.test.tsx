import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
}));

import PatientDashboardPage from "@/app/patient/dashboard/page";
import { useAuthStore } from "@/lib/auth-store";

describe("PatientDashboardPage", () => {
  beforeEach(() => {
    replaceMock.mockReset();
  });

  it("redirects to login when there is no session", () => {
    useAuthStore.setState({ token: null, role: null, phone: null, doctorId: null, doctorFullName: null });
    render(<PatientDashboardPage />);
    expect(replaceMock).toHaveBeenCalledWith("/login");
  });

  it("shows the patient's digital health card and membership tier", async () => {
    useAuthStore.setState({
      token: "pat-token",
      role: "PATIENT",
      phone: "+919876500099",
      doctorId: null,
      doctorFullName: null,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          patient_id: "p1",
          patient_display_id: "SUR-2026-000900",
          full_name: "Dashboard Patient",
          dob: "1990-01-01",
          gender: "MALE",
          blood_group: "B+",
          known_allergies: "Penicillin",
          emergency_contact_phone: "+919876500098",
          qr_card: {
            card_id: "c1",
            token_uuid: "t1",
            status: "ACTIVE",
            issued_date: "2026-01-01",
            expiry_date: "2027-01-01",
          },
          membership_tier: "GOLD",
          membership_plan_name: "Family Gold",
        }),
      })
    );

    render(<PatientDashboardPage />);

    expect(await screen.findByText("Dashboard Patient")).toBeInTheDocument();
    expect(screen.getAllByText(/SUR-2026-000900/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/GOLD Member/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Family Gold/i)).toBeInTheDocument();
    expect(screen.getByText(/ALLERGIES: Penicillin/i)).toBeInTheDocument();

    const familyLink = screen.getByRole("link", { name: /family members/i });
    expect(familyLink.getAttribute("href")).toBe("/patient/family");

    const notifLink = screen.getByRole("link", { name: /notifications/i });
    expect(notifLink.getAttribute("href")).toBe("/notifications");
  });
});
