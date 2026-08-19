import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ContactPage from "@/app/contact/page";

describe("ContactPage", () => {
  it("renders the hospital's contact details", () => {
    render(<ContactPage />);
    expect(screen.getByRole("heading", { name: /contact us/i })).toBeInTheDocument();
    expect(screen.getByText(/24x7 emergency/i)).toBeInTheDocument();
  });
});
