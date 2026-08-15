import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "@/app/page";

describe("Home", () => {
  it("renders the product name and hero headline", () => {
    render(<Home />);
    expect(screen.getAllByText("Suraksha DHPMS").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/10 seconds/i);
  });

  it("links each patient-journey step to the page that actually implements it", () => {
    render(<Home />);
    const registerLinks = screen.getAllByRole("link", { name: /register a patient/i });
    expect(registerLinks.some((link) => link.getAttribute("href") === "/register")).toBe(true);
    expect(screen.getByRole("link", { name: /open the scanner/i })).toHaveAttribute("href", "/reception/scanner");
    expect(screen.getByRole("link", { name: /open doctor view/i })).toHaveAttribute("href", "/doctor/dashboard");
  });

  it("has a header Login link, since patients and staff both need to sign in", () => {
    render(<Home />);
    const loginLinks = screen.getAllByRole("link", { name: /^log in$/i });
    expect(loginLinks.some((link) => link.getAttribute("href") === "/login")).toBe(true);
  });
});
