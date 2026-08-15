import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BillingSummary } from "@/components/billing/BillingSummary";

const items = [
  { description: "OPD Consultation", category: "CONSULTATION", unitPrice: 500, discountPct: 20, finalPrice: 400 },
  { description: "Blood Test", category: "LAB", unitPrice: 1000, discountPct: 15, finalPrice: 850 },
];

describe("BillingSummary", () => {
  it("renders each line item with its discount percentage", () => {
    render(<BillingSummary items={items} grossAmount={1500} discountAmount={250} netAmount={1250} />);
    expect(screen.getByText("OPD Consultation")).toBeInTheDocument();
    expect(screen.getByText(/20%/)).toBeInTheDocument();
  });

  it("shows the total savings and net payable amount", () => {
    render(<BillingSummary items={items} grossAmount={1500} discountAmount={250} netAmount={1250} />);
    expect(screen.getByText(/₹250\.00/)).toBeInTheDocument();
    expect(screen.getByText(/₹1,?250\.00/)).toBeInTheDocument();
  });

  it("does not show a savings line when there is no discount", () => {
    render(<BillingSummary items={items} grossAmount={1500} discountAmount={0} netAmount={1500} />);
    expect(screen.queryByText(/you saved/i)).not.toBeInTheDocument();
  });
});
