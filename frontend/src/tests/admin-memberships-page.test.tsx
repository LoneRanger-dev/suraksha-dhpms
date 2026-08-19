import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
}));

import AdminMembershipsPage from "@/app/admin/memberships/page";
import { useAuthStore } from "@/lib/auth-store";

describe("AdminMembershipsPage", () => {
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
    render(<AdminMembershipsPage />);
    expect(replaceMock).toHaveBeenCalledWith("/login");
  });

  it("lists existing plans", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ plan_id: "p1", name: "Family Gold", tier: "GOLD" }],
      })
    );

    render(<AdminMembershipsPage />);

    expect(await screen.findByText("Family Gold")).toBeInTheDocument();

    const doctorsLink = screen.getByRole("link", { name: /doctors & departments/i });
    expect(doctorsLink.getAttribute("href")).toBe("/admin/doctors");
  });

  it("adds a new membership plan", async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            plan_id: "p2",
            name: "Senior Care Platinum",
            tier: "PLATINUM",
            price: "4999.00",
            validity_days: 365,
            consultation_discount_pct: "25.00",
            lab_discount_pct: "20.00",
            pharmacy_discount_pct: "15.00",
            is_active: true,
          }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => [] });
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<AdminMembershipsPage />);

    await screen.findByLabelText(/plan name/i);
    await user.type(screen.getByLabelText(/plan name/i), "Senior Care Platinum");
    await user.selectOptions(screen.getByLabelText(/^tier/i), "PLATINUM");
    await user.type(screen.getByLabelText(/^price/i), "4999");
    await user.type(screen.getByLabelText(/consultation discount/i), "25");
    await user.type(screen.getByLabelText(/lab discount/i), "20");
    await user.type(screen.getByLabelText(/pharmacy discount/i), "15");
    await user.click(screen.getByRole("button", { name: /add plan/i }));

    expect(await screen.findByText("Senior Care Platinum")).toBeInTheDocument();
  });
});
