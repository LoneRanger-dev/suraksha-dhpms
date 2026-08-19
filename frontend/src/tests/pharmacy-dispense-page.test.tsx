import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
}));

import PharmacyDispensePage from "@/app/(staff)/pharmacy/dispense/page";
import { useAuthStore } from "@/lib/auth-store";

describe("PharmacyDispensePage", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    useAuthStore.setState({
      token: "pharma-token",
      role: "PHARMACIST",
      phone: "+919876500099",
      doctorId: null,
      doctorFullName: null,
    });
  });

  it("redirects to login when there is no session", () => {
    useAuthStore.setState({ token: null, role: null, phone: null, doctorId: null, doctorFullName: null });
    render(<PharmacyDispensePage />);
    expect(replaceMock).toHaveBeenCalledWith("/login");
  });

  it("looks up a patient and lists their prescriptions with a dispense action", async () => {
    const fetchMock = vi.fn((url: string) => {
      if (String(url).includes("/scan/")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ patient_id: "p1", full_name: "Rx Patient", patient_display_id: "SUR-2026-000700" }),
        });
      }
      if (String(url).includes("/prescriptions")) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            {
              prescription_id: "rx1",
              patient_id: "p1",
              instructions: null,
              created_at: "2026-08-19T10:00:00Z",
              dispensed: false,
              dispensed_at: null,
              items: [
                { item_id: "i1", medicine_name: "Paracetamol", dosage: "500 mg", frequency: "1-0-1", duration: "3 Days", intake_instructions: null },
              ],
            },
          ],
        });
      }
      return Promise.reject(new Error(`unexpected url ${url}`));
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<PharmacyDispensePage />);

    await user.type(screen.getByLabelText(/patient id or token/i), "SUR-2026-000700");
    await user.click(screen.getByRole("button", { name: /look up/i }));

    expect(await screen.findByText("Paracetamol")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /mark dispensed/i })).toBeInTheDocument();
  });

  it("marks a prescription as dispensed", async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (String(url).includes("/scan/")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ patient_id: "p1", full_name: "Rx Patient", patient_display_id: "SUR-2026-000700" }),
        });
      }
      if (init?.method === "POST" && String(url).includes("/dispense")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            prescription_id: "rx1",
            patient_id: "p1",
            instructions: null,
            created_at: "2026-08-19T10:00:00Z",
            dispensed: true,
            dispensed_at: "2026-08-19T10:05:00Z",
            items: [],
          }),
        });
      }
      if (String(url).includes("/prescriptions")) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            {
              prescription_id: "rx1",
              patient_id: "p1",
              instructions: null,
              created_at: "2026-08-19T10:00:00Z",
              dispensed: false,
              dispensed_at: null,
              items: [
                { item_id: "i1", medicine_name: "Paracetamol", dosage: "500 mg", frequency: "1-0-1", duration: "3 Days", intake_instructions: null },
              ],
            },
          ],
        });
      }
      return Promise.reject(new Error(`unexpected url ${url}`));
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<PharmacyDispensePage />);

    await user.type(screen.getByLabelText(/patient id or token/i), "SUR-2026-000700");
    await user.click(screen.getByRole("button", { name: /look up/i }));
    await screen.findByText("Paracetamol");

    await user.click(screen.getByRole("button", { name: /mark dispensed/i }));

    expect(await screen.findByText(/dispensed/i)).toBeInTheDocument();
  });
});
