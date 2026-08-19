import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
}));

import AdminDoctorsPage from "@/app/admin/doctors/page";
import { useAuthStore } from "@/lib/auth-store";

describe("AdminDoctorsPage", () => {
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
    render(<AdminDoctorsPage />);
    expect(replaceMock).toHaveBeenCalledWith("/login");
  });

  it("redirects a non-admin role away", () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
    useAuthStore.setState({
      token: "doc-token",
      role: "DOCTOR",
      phone: "+919876500099",
      doctorId: "d1",
      doctorFullName: "Dr. Test",
    });
    render(<AdminDoctorsPage />);
    expect(replaceMock).toHaveBeenCalledWith("/login");
  });

  it("lists existing doctors and departments", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (String(url).includes("/doctors")) {
          return Promise.resolve({
            ok: true,
            json: async () => [
              { doctor_id: "d1", full_name: "Dr. Anjali Rao", specialization: "General Physician", department_name: "General Medicine", consultation_fee: "500.00" },
            ],
          });
        }
        if (String(url).includes("/departments")) {
          return Promise.resolve({
            ok: true,
            json: async () => [{ department_id: "dept1", name: "General Medicine", description: null }],
          });
        }
        return Promise.reject(new Error(`unexpected url ${url}`));
      })
    );

    render(<AdminDoctorsPage />);

    expect(await screen.findByText("Dr. Anjali Rao")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "General Medicine" })).toBeInTheDocument();

    const membershipsLink = screen.getByRole("link", { name: /membership plans/i });
    expect(membershipsLink.getAttribute("href")).toBe("/admin/memberships");
  });

  it("adds a new department", async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (String(url).includes("/doctors")) return Promise.resolve({ ok: true, json: async () => [] });
      if (String(url).includes("/departments") && init?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ department_id: "dept2", name: "Orthopedics", description: null }),
        });
      }
      if (String(url).includes("/departments")) return Promise.resolve({ ok: true, json: async () => [] });
      return Promise.reject(new Error(`unexpected url ${url}`));
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<AdminDoctorsPage />);

    await screen.findByRole("button", { name: /add department/i });
    await user.type(screen.getByLabelText(/department name/i), "Orthopedics");
    await user.click(screen.getByRole("button", { name: /add department/i }));

    expect(await screen.findByRole("option", { name: "Orthopedics" })).toBeInTheDocument();
  });

  it("adds a new doctor", async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (String(url).includes("/departments")) {
        return Promise.resolve({
          ok: true,
          json: async () => [{ department_id: "dept1", name: "General Medicine", description: null }],
        });
      }
      if (String(url).includes("/doctors") && init?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            doctor_id: "d2",
            full_name: "Dr. New Hire",
            specialization: "Neurologist",
            department_name: "General Medicine",
            consultation_fee: "800.00",
          }),
        });
      }
      if (String(url).includes("/doctors")) return Promise.resolve({ ok: true, json: async () => [] });
      return Promise.reject(new Error(`unexpected url ${url}`));
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<AdminDoctorsPage />);

    await screen.findByLabelText(/full name/i);
    await user.type(screen.getByLabelText(/full name/i), "Dr. New Hire");
    await user.type(screen.getByLabelText(/^phone/i), "+919876500070");
    await user.type(screen.getByLabelText(/^password/i), "Doctor@123");
    await user.type(screen.getByLabelText(/qualification/i), "MBBS, MD");
    await user.type(screen.getByLabelText(/specialization/i), "Neurologist");
    await user.click(screen.getByRole("button", { name: /add doctor/i }));

    expect(await screen.findByText("Dr. New Hire")).toBeInTheDocument();
  });
});
