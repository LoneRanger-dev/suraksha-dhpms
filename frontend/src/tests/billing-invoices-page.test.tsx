import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replaceMock = vi.fn();
const searchParams = new URLSearchParams({
  patientId: "p1",
  visitId: "v1",
  patientName: "Bill Patient",
});
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
  useSearchParams: () => searchParams,
}));

import BillingInvoicesPage from "@/app/(staff)/billing/invoices/page";
import { useAuthStore } from "@/lib/auth-store";

describe("BillingInvoicesPage", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    useAuthStore.setState({
      token: "staff-token",
      role: "RECEPTIONIST",
      phone: "+919876500002",
      doctorId: null,
      doctorFullName: null,
    });
  });

  it("renders the patient name and a line-item builder", () => {
    render(<BillingInvoicesPage />);
    expect(screen.getByText("Bill Patient")).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/unit price/i)).toBeInTheDocument();
  });

  it("generates the invoice and shows the bill summary with discount applied", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          invoice_id: "inv1",
          patient_id: "p1",
          gross_amount: "500.00",
          discount_amount: "50.00",
          net_amount: "450.00",
          status: "UNPAID",
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
        }),
      })
    );

    const user = userEvent.setup();
    render(<BillingInvoicesPage />);

    await user.type(screen.getByLabelText(/description/i), "Consultation Fee");
    await user.selectOptions(screen.getByLabelText(/category/i), "CONSULTATION");
    await user.type(screen.getByLabelText(/unit price/i), "500");
    await user.click(screen.getByRole("button", { name: /generate invoice/i }));

    expect(await screen.findByText(/net payable/i)).toBeInTheDocument();
    expect(screen.getByText(/you saved/i)).toBeInTheDocument();
  });
});
