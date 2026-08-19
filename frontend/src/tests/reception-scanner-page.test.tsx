import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pushMock = vi.fn();
const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
}));

const startMock = vi.fn().mockRejectedValue(new Error("camera denied"));
vi.mock("html5-qrcode", () => ({
  Html5Qrcode: vi.fn().mockImplementation(() => ({
    start: startMock,
    stop: vi.fn().mockResolvedValue(undefined),
  })),
}));

import ReceptionScannerPage from "@/app/(staff)/reception/scanner/page";
import { useAuthStore } from "@/lib/auth-store";

describe("ReceptionScannerPage", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ doctor_id: "d1", full_name: "Dr. Cardio", specialization: "Cardiology", department_name: "Cardiology" }],
      })
    );
  });

  it("redirects to login when there is no session", () => {
    useAuthStore.setState({ token: null, role: null, phone: null, doctorId: null, doctorFullName: null });
    render(<ReceptionScannerPage />);
    expect(replaceMock).toHaveBeenCalledWith("/login");
  });

  it("renders the fast-scan check-in heading and scanner for a signed-in receptionist", async () => {
    useAuthStore.setState({
      token: "staff-token",
      role: "RECEPTIONIST",
      phone: "+919876543210",
      doctorId: null,
      doctorFullName: null,
    });
    render(<ReceptionScannerPage />);

    expect(screen.getByRole("heading", { name: /fast-scan check-in/i })).toBeInTheDocument();
    expect(await screen.findByLabelText(/patient id or token/i)).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("link", { name: /manage doctors/i })).not.toBeInTheDocument();
  });

  it("shows a Manage Doctors link for an admin role", async () => {
    useAuthStore.setState({
      token: "admin-token",
      role: "SUPER_ADMIN",
      phone: "+919876543211",
      doctorId: null,
      doctorFullName: null,
    });
    render(<ReceptionScannerPage />);

    const link = await screen.findByRole("link", { name: /manage doctors/i });
    expect(link.getAttribute("href")).toBe("/admin/doctors");
  });
});
