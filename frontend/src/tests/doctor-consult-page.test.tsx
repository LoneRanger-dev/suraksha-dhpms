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
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
    render(<ConsultPage />);
    expect(screen.getByText("Consult Patient")).toBeInTheDocument();
    expect(screen.getByLabelText(/chief complaint/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/diagnosis/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/blood pressure/i)).toBeInTheDocument();
  });

  it("shows the patient's previous visit history on load", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (String(url).includes("/history")) {
          return Promise.resolve({
            ok: true,
            json: async () => [
              {
                visit_id: "v0",
                patient_id: "p1",
                doctor_id: "d2",
                chief_complaint: "Cough",
                diagnosis: "Bronchitis",
                visit_date: "2026-07-01T09:00:00Z",
              },
            ],
          });
        }
        return Promise.reject(new Error(`unexpected url ${url}`));
      })
    );

    render(<ConsultPage />);

    expect(await screen.findByText("Bronchitis")).toBeInTheDocument();
  });

  it("shows a no-history message when the patient has no previous visits", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));

    render(<ConsultPage />);

    expect(await screen.findByText(/no previous visits/i)).toBeInTheDocument();
  });

  it("saves the visit and reveals the prescription builder", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (String(url).includes("/history")) {
          return Promise.resolve({ ok: true, json: async () => [] });
        }
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

  it("sends the doctor back to their queue after saving a prescription, not to the billing page", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (String(url).includes("/history")) {
          return Promise.resolve({ ok: true, json: async () => [] });
        }
        if (String(url).includes("/prescriptions")) {
          return Promise.resolve({ ok: true, json: async () => ({ prescription_id: "rx1", items: [] }) });
        }
        if (String(url).includes("/consultations/visits")) {
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
    await screen.findByText(/^prescription$/i);
    await user.click(screen.getByRole("button", { name: /save prescription/i }));

    const backLink = await screen.findByRole("link", { name: /back to queue/i });
    expect(backLink.getAttribute("href")).toBe("/doctor/dashboard");
    expect(screen.queryByRole("button", { name: /send to billing/i })).not.toBeInTheDocument();
  });
});
