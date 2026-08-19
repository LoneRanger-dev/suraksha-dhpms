import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MembershipPlansPage from "@/app/membership-plans/page";

describe("MembershipPlansPage", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            plan_id: "p1",
            name: "Individual Free",
            tier: "FREE",
            price: "0.00",
            validity_days: 365,
            consultation_discount_pct: "0.00",
            lab_discount_pct: "0.00",
            pharmacy_discount_pct: "0.00",
          },
          {
            plan_id: "p2",
            name: "Family Gold",
            tier: "GOLD",
            price: "2999.00",
            validity_days: 365,
            consultation_discount_pct: "20.00",
            lab_discount_pct: "15.00",
            pharmacy_discount_pct: "10.00",
          },
        ],
      })
    );
  });

  it("lists the available membership plans", async () => {
    render(<MembershipPlansPage />);

    expect(await screen.findByText("Family Gold")).toBeInTheDocument();
    expect(screen.getByText("Individual Free")).toBeInTheDocument();
  });

  it("links to registration to purchase a plan", async () => {
    render(<MembershipPlansPage />);

    await screen.findByText("Family Gold");
    const links = screen.getAllByRole("link", { name: /register/i });
    expect(links.some((link) => link.getAttribute("href") === "/register")).toBe(true);
  });
});
