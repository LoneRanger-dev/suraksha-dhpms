import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
}));

import AdminNotificationsPage from "@/app/admin/notifications/page";
import { useAuthStore } from "@/lib/auth-store";

describe("AdminNotificationsPage", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    useAuthStore.setState({
      token: "admin-token",
      role: "SUPER_ADMIN",
      phone: "+919876500099",
      doctorId: null,
      doctorFullName: null,
    });
  });

  it("redirects to login when there is no session", () => {
    useAuthStore.setState({ token: null, role: null, phone: null, doctorId: null, doctorFullName: null });
    render(<AdminNotificationsPage />);
    expect(replaceMock).toHaveBeenCalledWith("/login");
  });

  it("lists every notification sent, with recipient and status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            notification_id: "n1",
            recipient_phone: "+919000000074",
            recipient_role: "DOCTOR",
            title: "New check-in",
            message: "Appt Patient has checked in, token GENERA-001.",
            is_read: false,
            created_at: "2026-08-20T09:00:00Z",
          },
        ],
      })
    );

    render(<AdminNotificationsPage />);

    expect(await screen.findByText(/Appt Patient has checked in/)).toBeInTheDocument();
    expect(screen.getByText(/\+919000000074/)).toBeInTheDocument();
    expect(screen.getByText(/DOCTOR/)).toBeInTheDocument();

    const billingLink = screen.getByRole("link", { name: /^billing$/i });
    expect(billingLink.getAttribute("href")).toBe("/admin/billing");
  });
});
