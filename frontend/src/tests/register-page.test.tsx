import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import RegisterPage from "@/app/register/page";

const PLAN_ID = "33333333-3333-3333-3333-333333333333";

function mockFetch() {
  return vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === "POST") {
      return {
        ok: true,
        json: async () => ({
          patient_id: "11111111-1111-1111-1111-111111111111",
          patient_display_id: "SUR-2026-000001",
          full_name: "Test Patient",
          qr_card: { card_id: "22222222-2222-2222-2222-222222222222", status: "ACTIVE" },
        }),
      };
    }
    return {
      ok: true,
      json: async () => [{ plan_id: PLAN_ID, name: "Free", tier: "FREE" }],
    };
  });
}

describe("RegisterPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch());
  });

  it("renders the registration form fields", async () => {
    render(<RegisterPage />);
    expect(screen.getByRole("heading", { name: /register/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date of birth/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/emergency contact phone/i)).toBeInTheDocument();
    await screen.findByRole("option", { name: /free/i });
  });

  it("shows a validation error for an invalid emergency contact phone", async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);
    await screen.findByRole("option", { name: /free/i });

    await user.type(screen.getByLabelText(/full name/i), "Test Patient");
    await user.type(screen.getByLabelText(/date of birth/i), "1990-01-01");
    await user.type(screen.getByLabelText(/emergency contact phone/i), "123");
    await user.click(screen.getByRole("button", { name: /register/i }));

    expect(await screen.findByText(/valid.*mobile number/i)).toBeInTheDocument();
  });

  it("submits valid data and shows the generated patient ID", async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);
    await screen.findByRole("option", { name: /free/i });

    await user.type(screen.getByLabelText(/full name/i), "Test Patient");
    await user.type(screen.getByLabelText(/date of birth/i), "1990-01-01");
    await user.type(screen.getByLabelText(/emergency contact phone/i), "+919876543210");
    await user.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/patients"),
        expect.objectContaining({ method: "POST" })
      )
    );
    expect(await screen.findByText(/SUR-2026-000001/)).toBeInTheDocument();

    const homeLink = screen.getByRole("link", { name: /back to home/i });
    expect(homeLink.getAttribute("href")).toBe("/");
    expect(screen.getByRole("button", { name: /register another patient/i })).toBeInTheDocument();
  });

  it("lets staff register another patient without leaving the page", async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);
    await screen.findByRole("option", { name: /free/i });

    await user.type(screen.getByLabelText(/full name/i), "Test Patient");
    await user.type(screen.getByLabelText(/date of birth/i), "1990-01-01");
    await user.type(screen.getByLabelText(/emergency contact phone/i), "+919876543210");
    await user.click(screen.getByRole("button", { name: /register/i }));
    await screen.findByText(/SUR-2026-000001/);

    await user.click(screen.getByRole("button", { name: /register another patient/i }));

    expect(screen.getByRole("heading", { name: /^register$/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toHaveValue("");
  });
});
