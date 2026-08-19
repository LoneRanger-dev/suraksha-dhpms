import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
}));

import AdminPatientsPage from "@/app/admin/patients/page";
import { useAuthStore } from "@/lib/auth-store";

describe("AdminPatientsPage", () => {
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
    render(<AdminPatientsPage />);
    expect(replaceMock).toHaveBeenCalledWith("/login");
  });

  it("lists patients", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            patient_id: "p1",
            patient_display_id: "SUR-2026-000010",
            full_name: "Roster Patient",
            dob: "1990-01-01",
            gender: "MALE",
            emergency_contact_phone: "+919876500097",
            created_at: "2026-08-19T09:00:00Z",
          },
        ],
      })
    );

    render(<AdminPatientsPage />);

    expect(await screen.findByText("Roster Patient")).toBeInTheDocument();
    expect(screen.getByText(/SUR-2026-000010/)).toBeInTheDocument();
  });

  it("searches patients by name or ID", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          patient_id: "p1",
          patient_display_id: "SUR-2026-000010",
          full_name: "Roster Patient",
          dob: "1990-01-01",
          gender: "MALE",
          emergency_contact_phone: "+919876500097",
          created_at: "2026-08-19T09:00:00Z",
        },
      ],
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<AdminPatientsPage />);

    await screen.findByText("Roster Patient");
    await user.type(screen.getByLabelText(/search/i), "Roster");

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("search=Roster"), expect.anything());
  });
});
