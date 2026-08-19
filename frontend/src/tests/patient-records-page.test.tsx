import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
}));

import PatientRecordsPage from "@/app/patient/records/page";
import { useAuthStore } from "@/lib/auth-store";

describe("PatientRecordsPage", () => {
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
    render(<PatientRecordsPage />);
    expect(replaceMock).toHaveBeenCalledWith("/login");
  });

  it("shows medical history, prescriptions, and bills", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (String(url).includes("/patients/me/visits")) {
          return Promise.resolve({
            ok: true,
            json: async () => [
              {
                visit_id: "v1",
                patient_id: "p1",
                doctor_id: "d1",
                chief_complaint: "Fever",
                diagnosis: "Viral fever",
                visit_date: "2026-08-10T10:00:00Z",
              },
            ],
          });
        }
        if (String(url).includes("/patients/me/prescriptions")) {
          return Promise.resolve({
            ok: true,
            json: async () => [
              {
                prescription_id: "rx1",
                visit_id: "v1",
                patient_id: "p1",
                instructions: "Rest and hydration",
                created_at: "2026-08-10T10:15:00Z",
                items: [
                  {
                    item_id: "i1",
                    medicine_name: "Paracetamol",
                    dosage: "500 mg",
                    frequency: "1-1-1",
                    duration: "3 Days",
                    intake_instructions: "After food",
                  },
                ],
              },
            ],
          });
        }
        if (String(url).includes("/patients/me/invoices")) {
          return Promise.resolve({
            ok: true,
            json: async () => [
              {
                invoice_id: "inv1",
                patient_id: "p1",
                gross_amount: "500.00",
                discount_amount: "50.00",
                net_amount: "450.00",
                status: "PAID",
                items: [
                  {
                    invoice_item_id: "ii1",
                    description: "Consultation Fee",
                    category: "CONSULTATION",
                    unit_price: "500.00",
                    discount_pct: "10.00",
                    final_price: "450.00",
                  },
                ],
              },
            ],
          });
        }
        return Promise.reject(new Error(`unexpected url ${url}`));
      })
    );

    render(<PatientRecordsPage />);

    expect(await screen.findByText("Viral fever")).toBeInTheDocument();
    expect(screen.getByText("Paracetamol")).toBeInTheDocument();
    expect(screen.getByText(/net payable/i)).toBeInTheDocument();
  });

  it("downloads the prescription PDF with the auth token, since a plain link can't carry it", async () => {
    const pdfBlob = new Blob(["%PDF-1.4"], { type: "application/pdf" });
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (String(url).includes("/consultations/prescriptions/")) {
        expect(init?.headers).toMatchObject({ Authorization: "Bearer pat-token" });
        return Promise.resolve({ ok: true, blob: async () => pdfBlob });
      }
      if (String(url).includes("/patients/me/visits")) return Promise.resolve({ ok: true, json: async () => [] });
      if (String(url).includes("/patients/me/prescriptions")) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            {
              prescription_id: "rx1",
              visit_id: "v1",
              patient_id: "p1",
              instructions: null,
              created_at: "2026-08-10T10:15:00Z",
              items: [
                {
                  item_id: "i1",
                  medicine_name: "Paracetamol",
                  dosage: "500 mg",
                  frequency: "1-1-1",
                  duration: "3 Days",
                  intake_instructions: null,
                },
              ],
            },
          ],
        });
      }
      if (String(url).includes("/patients/me/invoices")) return Promise.resolve({ ok: true, json: async () => [] });
      return Promise.reject(new Error(`unexpected url ${url}`));
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:mock"), revokeObjectURL: vi.fn() });

    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    render(<PatientRecordsPage />);

    await user.click(await screen.findByRole("button", { name: /download pdf/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/consultations/prescriptions/rx1/pdf"),
      expect.objectContaining({ headers: { Authorization: "Bearer pat-token" } })
    );
  });
});
