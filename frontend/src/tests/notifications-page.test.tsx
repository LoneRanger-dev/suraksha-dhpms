import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
}));

import NotificationsPage from "@/app/notifications/page";
import { useAuthStore } from "@/lib/auth-store";

describe("NotificationsPage", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    useAuthStore.setState({
      token: "doc-token",
      role: "DOCTOR",
      phone: "+919876500099",
      doctorId: "d1",
      doctorFullName: "Dr. Test",
    });
  });

  it("redirects to login when there is no session", () => {
    useAuthStore.setState({ token: null, role: null, phone: null, doctorId: null, doctorFullName: null });
    render(<NotificationsPage />);
    expect(replaceMock).toHaveBeenCalledWith("/login");
  });

  it("lists notifications, distinguishing unread from read", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            notification_id: "n1",
            title: "New appointment",
            message: "Consult Patient booked a 10:00 appointment on 2026-08-20.",
            is_read: false,
            created_at: "2026-08-19T09:00:00Z",
          },
          {
            notification_id: "n2",
            title: "New check-in",
            message: "Old Patient has checked in, token GEN-001.",
            is_read: true,
            created_at: "2026-08-18T09:00:00Z",
          },
        ],
      })
    );

    render(<NotificationsPage />);

    expect(await screen.findByText("New appointment")).toBeInTheDocument();
    expect(screen.getByText("New check-in")).toBeInTheDocument();
    expect(screen.getAllByText(/unread/i).length).toBe(1);
  });

  it("marks a notification as read when clicked", async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            notification_id: "n1",
            title: "New appointment",
            message: "Consult Patient booked a 10:00 appointment on 2026-08-20.",
            is_read: true,
            created_at: "2026-08-19T09:00:00Z",
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => [
          {
            notification_id: "n1",
            title: "New appointment",
            message: "Consult Patient booked a 10:00 appointment on 2026-08-20.",
            is_read: false,
            created_at: "2026-08-19T09:00:00Z",
          },
        ],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<NotificationsPage />);

    await user.click(await screen.findByText("New appointment"));

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/notifications/n1/read"),
      expect.objectContaining({ method: "POST" })
    );
    await waitFor(() => expect(screen.queryAllByText(/unread/i)).toHaveLength(0));
  });
});
