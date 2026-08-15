import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PatientHealthCard } from "@/components/cards/PatientHealthCard";

const baseProps = {
  fullName: "Manvith M N",
  patientDisplayId: "SUR-2026-0001245",
  dob: "2005-09-04",
  gender: "MALE" as const,
  bloodGroup: "B+",
  allergies: "Penicillin",
  membershipTier: "GOLD" as const,
  validThru: "2027-08-01",
  emergencyPhone: "+91 800-555-0199",
};

describe("PatientHealthCard", () => {
  it("renders patient identity and membership tier", () => {
    render(<PatientHealthCard {...baseProps} />);
    expect(screen.getByText("Manvith M N")).toBeInTheDocument();
    expect(screen.getByText(/SUR-2026-0001245/)).toBeInTheDocument();
    expect(screen.getByText(/GOLD/)).toBeInTheDocument();
  });

  it("flags known allergies with an alert style", () => {
    render(<PatientHealthCard {...baseProps} />);
    const allergyText = screen.getByText(/Penicillin/);
    expect(allergyText).toHaveClass("text-destructive");
  });

  it("does not alert when there are no known allergies", () => {
    render(<PatientHealthCard {...baseProps} allergies="None" />);
    const allergyText = screen.getByText(/None/);
    expect(allergyText).not.toHaveClass("text-destructive");
  });
});
