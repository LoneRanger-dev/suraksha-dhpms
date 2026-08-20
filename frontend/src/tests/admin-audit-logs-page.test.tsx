import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
}));

import AdminAuditLogsPage from "@/app/admin/audit-logs/page";
import { useAuthStore } from "@/lib/auth-store";

describe("AdminAuditLogsPage", () => {
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
    render(<AdminAuditLogsPage />);
    expect(replaceMock).toHaveBeenCalledWith("/login");
  });

  it("redirects a non-super-admin role away", () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
    useAuthStore.setState({
      token: "admin-token",
      role: "ADMIN",
      phone: "+919876500099",
      doctorId: null,
      doctorFullName: null,
    });
    render(<AdminAuditLogsPage />);
    expect(replaceMock).toHaveBeenCalledWith("/login");
  });

  it("lists audit log entries with action, entity, and actor", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            log_id: "log1",
            performed_by: "11111111-1111-1111-1111-111111111111",
            action: "CREATE",
            entity_affected: "patient",
            entity_id: "22222222-2222-2222-2222-222222222222",
            ip_address: "127.0.0.1",
            timestamp: "2026-08-20T09:00:00Z",
          },
        ],
      })
    );

    render(<AdminAuditLogsPage />);

    expect(await screen.findByText("CREATE")).toBeInTheDocument();
    expect(screen.getByText("patient")).toBeInTheDocument();

    const billingLink = screen.getByRole("link", { name: /billing/i });
    expect(billingLink.getAttribute("href")).toBe("/admin/billing");

    const doctorsLink = screen.getByRole("link", { name: /doctors & departments/i });
    expect(doctorsLink.getAttribute("href")).toBe("/admin/doctors");
  });

  it("filters by entity id when searched", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<AdminAuditLogsPage />);

    await screen.findByLabelText(/entity id/i);
    await user.type(screen.getByLabelText(/entity id/i), "22222222-2222-2222-2222-222222222222");
    await user.click(screen.getByRole("button", { name: /filter/i }));

    const lastCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1][0] as string;
    expect(lastCall).toContain("entity_id=22222222-2222-2222-2222-222222222222");
  });
});
