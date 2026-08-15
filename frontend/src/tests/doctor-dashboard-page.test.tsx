import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import DoctorDashboardPage from "@/app/(staff)/doctor/dashboard/page";

describe("DoctorDashboardPage", () => {
  it("renders the today's appointments heading", () => {
    render(<DoctorDashboardPage />);
    expect(screen.getByRole("heading", { name: /today's appointments/i })).toBeInTheDocument();
  });

  it("renders an empty-queue state when there are no appointments yet", () => {
    render(<DoctorDashboardPage />);
    expect(screen.getByText(/no appointments scheduled/i)).toBeInTheDocument();
  });
});
