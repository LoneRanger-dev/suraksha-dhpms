import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
}));

import DoctorFollowUpsPage from "@/app/(staff)/doctor/follow-ups/page";
import { useAuthStore } from "@/lib/auth-store";

describe("DoctorFollowUpsPage", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    useAuthStore.setState({
      token: "doc-token",
      role: "DOCTOR",
      phone: "+919876500001",
      doctorId: "d1",
      doctorFullName: "Dr. Test",
    });
  });

  it("redirects to login when there is no session", () => {
    useAuthStore.setState({ token: null, role: null, phone: null, doctorId: null, doctorFullName: null });
    render(<DoctorFollowUpsPage />);
    expect(replaceMock).toHaveBeenCalledWith("/login");
  });

  it("lists upcoming follow-ups and links to the patient's consult page", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            visit_id: "v1",
            patient_id: "p1",
            patient_display_id: "SUR-2026-000900",
            patient_full_name: "Follow-up Patient",
            diagnosis: "Muscle strain",
            follow_up_date: "2026-09-01",
          },
        ],
      })
    );

    render(<DoctorFollowUpsPage />);

    expect(await screen.findByText("Follow-up Patient")).toBeInTheDocument();
    expect(screen.getByText(/Muscle strain/)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /open/i });
    expect(link.getAttribute("href")).toContain("patientId=p1");
  });

  it("shows a no-follow-ups message when there are none", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));

    render(<DoctorFollowUpsPage />);

    expect(await screen.findByText(/no upcoming follow-ups/i)).toBeInTheDocument();
  });
});
