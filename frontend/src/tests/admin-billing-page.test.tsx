import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
}));

import AdminBillingPage from "@/app/admin/billing/page";
import { useAuthStore } from "@/lib/auth-store";

describe("AdminBillingPage", () => {
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
    render(<AdminBillingPage />);
    expect(replaceMock).toHaveBeenCalledWith("/login");
  });

  it("shows the revenue summary and invoice list", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (String(url).includes("/billing/summary")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              invoice_count: 2,
              total_gross: "800.00",
              total_discount: "100.00",
              total_net: "700.00",
            }),
          });
        }
        if (String(url).includes("/billing/invoices")) {
          return Promise.resolve({
            ok: true,
            json: async () => [
              {
                invoice_id: "inv1",
                patient_id: "p1",
                patient_display_id: "SUR-2026-000700",
                patient_full_name: "Billing List Patient",
                gross_amount: "500.00",
                discount_amount: "100.00",
                net_amount: "400.00",
                status: "UNPAID",
                created_at: "2026-08-20T09:00:00Z",
              },
            ],
          });
        }
        return Promise.reject(new Error(`unexpected url ${url}`));
      })
    );

    render(<AdminBillingPage />);

    expect(await screen.findByText("Billing List Patient")).toBeInTheDocument();
    expect(screen.getByText(/₹700/)).toBeInTheDocument();
    expect(screen.getByText(/2 invoices/i)).toBeInTheDocument();
  });
});
