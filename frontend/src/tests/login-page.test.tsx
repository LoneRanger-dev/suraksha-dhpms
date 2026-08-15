import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

import LoginPage from "@/app/login/page";
import { useAuthStore } from "@/lib/auth-store";

describe("LoginPage", () => {
  beforeEach(() => {
    pushMock.mockReset();
    useAuthStore.setState({ token: null, role: null, phone: null, doctorId: null, doctorFullName: null });
  });

  it("renders phone and password fields", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("shows an error for invalid credentials", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ detail: "Invalid phone or password" }),
      })
    );
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/phone number/i), "+919876543210");
    await user.type(screen.getByLabelText(/password/i), "wrong");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    expect(await screen.findByText(/invalid phone or password/i)).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("logs in a receptionist, stores the session, and redirects to the scanner", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.includes("/auth/login")) {
          return Promise.resolve({ ok: true, json: async () => ({ access_token: "tok123", role: "RECEPTIONIST" }) });
        }
        if (url.includes("/auth/me")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              user_id: "u1",
              phone: "+919876543210",
              role: "RECEPTIONIST",
              doctor_id: null,
              doctor_full_name: null,
            }),
          });
        }
        return Promise.reject(new Error(`unexpected url ${url}`));
      })
    );
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/phone number/i), "+919876543210");
    await user.type(screen.getByLabelText(/password/i), "Passw0rd!");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/reception/scanner"));
    expect(useAuthStore.getState().token).toBe("tok123");
    expect(useAuthStore.getState().role).toBe("RECEPTIONIST");
  });

  it("redirects a doctor to the doctor dashboard", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.includes("/auth/login")) {
          return Promise.resolve({ ok: true, json: async () => ({ access_token: "doctok", role: "DOCTOR" }) });
        }
        if (url.includes("/auth/me")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              user_id: "u2",
              phone: "+919876500001",
              role: "DOCTOR",
              doctor_id: "d1",
              doctor_full_name: "Dr. Test",
            }),
          });
        }
        return Promise.reject(new Error(`unexpected url ${url}`));
      })
    );
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/phone number/i), "+919876500001");
    await user.type(screen.getByLabelText(/password/i), "Passw0rd!");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/doctor/dashboard"));
    expect(useAuthStore.getState().doctorFullName).toBe("Dr. Test");
  });
});
