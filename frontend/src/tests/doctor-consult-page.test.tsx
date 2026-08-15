import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replaceMock = vi.fn();
const searchParams = new URLSearchParams({
  appointmentId: "a1",
  patientId: "p1",
  patientName: "Consult Patient",
});
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
  useSearchParams: () => searchParams,
}));

import ConsultPage from "@/app/(staff)/doctor/consult/page";
import { useAuthStore } from "@/lib/auth-store";

describe("ConsultPage", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    useAuthStore.setState({
      token: "doc-token",
      role: "DOCTOR",
      phone: "+919876500001",
      doctorId: "d1",
      doctorFullName: "Dr. Test",
    });
  });

  it("renders the patient name and vitals/diagnosis fields", () => {
    render(<ConsultPage />);
    expect(screen.getByText("Consult Patient")).toBeInTheDocument();
    expect(screen.getByLabelText(/chief complaint/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/diagnosis/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/blood pressure/i)).toBeInTheDocument();
  });

  it("saves the visit and reveals the prescription builder", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (String(url).includes("/consultations/visits") && !String(url).includes("prescriptions")) {
          return Promise.resolve({ ok: true, json: async () => ({ visit_id: "v1", diagnosis: "Viral fever" }) });
        }
        return Promise.reject(new Error(`unexpected url ${url}`));
      })
    );

    const user = userEvent.setup();
    render(<ConsultPage />);

    await user.type(screen.getByLabelText(/chief complaint/i), "Fever");
    await user.type(screen.getByLabelText(/diagnosis/i), "Viral fever");
    await user.click(screen.getByRole("button", { name: /save visit/i }));

    expect(await screen.findByText(/^prescription$/i)).toBeInTheDocument();
  });
});
