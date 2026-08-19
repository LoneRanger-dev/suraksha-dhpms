import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
}));

import PatientFamilyPage from "@/app/patient/family/page";
import { useAuthStore } from "@/lib/auth-store";

describe("PatientFamilyPage", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    useAuthStore.setState({
      token: "pat-token",
      role: "PATIENT",
      phone: "+919876500099",
      doctorId: null,
      doctorFullName: null,
    });
  });

  it("redirects to login when there is no session", () => {
    useAuthStore.setState({ token: null, role: null, phone: null, doctorId: null, doctorFullName: null });
    render(<PatientFamilyPage />);
    expect(replaceMock).toHaveBeenCalledWith("/login");
  });

  it("lists existing family members", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            patient_id: "f1",
            patient_display_id: "SUR-2026-000901",
            full_name: "Dependent Child",
            dob: "2015-06-10",
            gender: "MALE",
            relationship_to_primary: "CHILD",
            blood_group: "O+",
            known_allergies: "None",
          },
        ],
      })
    );

    render(<PatientFamilyPage />);

    expect(await screen.findByText("Dependent Child")).toBeInTheDocument();
    expect(screen.getByText(/CHILD.*SUR-2026-000901/)).toBeInTheDocument();
  });

  it("adds a new family member and shows it in the list", async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            patient_id: "f2",
            patient_display_id: "SUR-2026-000902",
            full_name: "New Spouse",
            dob: "1990-05-05",
            gender: "FEMALE",
            relationship_to_primary: "SPOUSE",
            blood_group: null,
            known_allergies: "None",
          }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => [] });
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<PatientFamilyPage />);

    await screen.findByRole("button", { name: /add family member/i });

    await user.type(screen.getByLabelText(/full name/i), "New Spouse");
    await user.type(screen.getByLabelText(/date of birth/i), "1990-05-05");
    await user.selectOptions(screen.getByLabelText(/relationship/i), "SPOUSE");
    await user.click(screen.getByRole("button", { name: /add family member/i }));

    expect(await screen.findByText("New Spouse")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/patients/me/family"),
      expect.objectContaining({ method: "POST", headers: expect.objectContaining({ Authorization: "Bearer pat-token" }) })
    );
  });
});
