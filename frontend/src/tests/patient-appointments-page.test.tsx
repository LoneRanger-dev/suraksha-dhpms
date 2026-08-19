import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
}));

import PatientAppointmentsPage from "@/app/patient/appointments/page";
import { useAuthStore } from "@/lib/auth-store";

describe("PatientAppointmentsPage", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    useAuthStore.setState({
      token: "pat-token",
      role: "PATIENT",
      phone: "+919876500099",
      doctorId: null,
      doctorFullName: null,
    });
  });

  it("redirects to login when there is no session", () => {
    useAuthStore.setState({ token: null, role: null, phone: null, doctorId: null, doctorFullName: null });
    render(<PatientAppointmentsPage />);
    expect(replaceMock).toHaveBeenCalledWith("/login");
  });

  it("lists existing appointments and shows the doctor selector for booking", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (String(url).includes("/patients/me/appointments")) {
          return Promise.resolve({
            ok: true,
            json: async () => [
              {
                appointment_id: "a1",
                patient_id: "p1",
                patient_display_id: "SUR-2026-000900",
                patient_full_name: "Dashboard Patient",
                doctor_id: "d1",
                doctor_full_name: "Dr. Anjali Rao",
                token_number: "GENERA-001",
                time_slot: "10:30",
                appointment_date: "2026-08-20",
                status: "SCHEDULED",
              },
            ],
          });
        }
        if (String(url).includes("/doctors")) {
          return Promise.resolve({
            ok: true,
            json: async () => [
              { doctor_id: "d1", full_name: "Dr. Anjali Rao", specialization: "General Physician", department_name: "General Medicine" },
            ],
          });
        }
        return Promise.reject(new Error(`unexpected url ${url}`));
      })
    );

    render(<PatientAppointmentsPage />);

    expect((await screen.findAllByText(/Dr\. Anjali Rao/)).length).toBeGreaterThan(0);
    expect(screen.getByText(/GENERA-001/)).toBeInTheDocument();
    expect(screen.getByLabelText(/doctor/i)).toBeInTheDocument();
  });

  it("books a new appointment", async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (String(url).includes("/patients/me/appointments")) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      if (String(url).includes("/doctors")) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            { doctor_id: "d1", full_name: "Dr. Anjali Rao", specialization: "General Physician", department_name: "General Medicine" },
          ],
        });
      }
      if (String(url).includes("/appointments/book")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            appointment_id: "a2",
            patient_id: "p1",
            doctor_id: "d1",
            appointment_date: "2026-08-21",
            time_slot: "11:00",
            token_number: "GENERA-002",
            status: "SCHEDULED",
          }),
        });
      }
      return Promise.reject(new Error(`unexpected url ${url}`));
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<PatientAppointmentsPage />);

    await screen.findByLabelText(/doctor/i);
    await user.selectOptions(screen.getByLabelText(/doctor/i), "d1");
    await user.type(screen.getByLabelText(/date/i), "2026-08-21");
    await user.type(screen.getByLabelText(/time/i), "11:00");
    await user.click(screen.getByRole("button", { name: /book appointment/i }));

    expect(await screen.findByText(/booked/i)).toBeInTheDocument();
  });
});
