import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ReceptionScannerPage from "@/app/(staff)/reception/scanner/page";

describe("ReceptionScannerPage", () => {
  it("renders the fast-scan check-in heading", () => {
    render(<ReceptionScannerPage />);
    expect(screen.getByRole("heading", { name: /fast-scan check-in/i })).toBeInTheDocument();
  });

  it("renders a manual token entry fallback for camera-denied scans", () => {
    render(<ReceptionScannerPage />);
    expect(screen.getByLabelText(/patient id or token/i)).toBeInTheDocument();
  });
});
