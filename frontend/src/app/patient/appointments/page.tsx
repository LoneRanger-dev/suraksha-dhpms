"use client";

import { useEffect, useState } from "react";

import { API_BASE_URL } from "@/lib/api";
import { useRequireAuth } from "@/lib/use-require-auth";

interface AppointmentItem {
  appointment_id: string;
  doctor_full_name: string;
  token_number: string;
  time_slot: string;
  appointment_date: string;
  status: string;
}

interface DoctorOption {
  doctor_id: string;
  full_name: string;
  specialization: string;
}

const inputClass =
  "rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

export default function PatientAppointmentsPage() {
  const { token } = useRequireAuth(["PATIENT"]);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [doctorId, setDoctorId] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [reason, setReason] = useState("");
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      fetch(`${API_BASE_URL}/api/v1/patients/me/appointments`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => (res.ok ? res.json() : [])),
      fetch(`${API_BASE_URL}/api/v1/doctors`).then((res) => (res.ok ? res.json() : [])),
    ])
      .then(([appts, docs]) => {
        setAppointments(Array.isArray(appts) ? appts : []);
        setDoctors(Array.isArray(docs) ? docs : []);
        if (Array.isArray(docs) && docs.length > 0) setDoctorId(docs[0].doctor_id);
      })
      .finally(() => setLoading(false));
  }, [token]);

  async function handleBook(event: React.FormEvent) {
    event.preventDefault();
    setBookingError(null);
    setConfirmation(null);
    setBooking(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/appointments/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          doctor_id: doctorId,
          appointment_date: appointmentDate,
          time_slot: timeSlot,
          reason_for_visit: reason || undefined,
        }),
      });
      if (!response.ok) throw new Error("Failed to book appointment");
      const appointment = await response.json();
      const doctor = doctors.find((doc) => doc.doctor_id === doctorId);
      setAppointments((prev) => [
        {
          appointment_id: appointment.appointment_id,
          doctor_full_name: doctor?.full_name ?? "Doctor",
          token_number: appointment.token_number,
          time_slot: appointment.time_slot,
          appointment_date: appointment.appointment_date,
          status: appointment.status,
        },
        ...prev,
      ]);
      setConfirmation(`Appointment booked — token ${appointment.token_number}.`);
      setAppointmentDate("");
      setTimeSlot("");
      setReason("");
    } catch {
      setBookingError("Could not book this appointment. Please try again.");
    } finally {
      setBooking(false);
    }
  }

  if (!token) {
    return null;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold text-foreground">My Appointments</h1>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : appointments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No appointments yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {appointments.map((appt) => (
            <li
              key={appt.appointment_id}
              className="flex items-center justify-between rounded-md border border-border p-3"
            >
              <div>
                <p className="text-sm font-semibold text-foreground">{appt.doctor_full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {appt.appointment_date} · {appt.time_slot} · Token {appt.token_number}
                </p>
              </div>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
                {appt.status}
              </span>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleBook} className="flex flex-col gap-4 rounded-lg border border-border p-4">
        <h2 className="text-sm font-semibold text-foreground">Book an Appointment</h2>

        <div className="flex flex-col gap-1">
          <label htmlFor="book_doctor" className="text-sm font-medium text-foreground">
            Doctor
          </label>
          <select
            id="book_doctor"
            value={doctorId}
            onChange={(event) => setDoctorId(event.target.value)}
            className={inputClass}
          >
            {doctors.length === 0 && <option value="">Loading doctors…</option>}
            {doctors.map((doctor) => (
              <option key={doctor.doctor_id} value={doctor.doctor_id}>
                {doctor.full_name} — {doctor.specialization}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="book_date" className="text-sm font-medium text-foreground">
            Date
          </label>
          <input
            id="book_date"
            type="date"
            value={appointmentDate}
            onChange={(event) => setAppointmentDate(event.target.value)}
            className={inputClass}
            required
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="book_time" className="text-sm font-medium text-foreground">
            Time
          </label>
          <input
            id="book_time"
            type="time"
            value={timeSlot}
            onChange={(event) => setTimeSlot(event.target.value)}
            className={inputClass}
            required
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="book_reason" className="text-sm font-medium text-foreground">
            Reason for Visit (optional)
          </label>
          <input
            id="book_reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className={inputClass}
          />
        </div>

        {bookingError && <p className="text-sm text-destructive">{bookingError}</p>}
        {confirmation && <p className="text-sm font-semibold text-success">{confirmation}</p>}

        <button
          type="submit"
          disabled={booking || !doctorId}
          className="w-fit rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          Book Appointment
        </button>
      </form>
    </main>
  );
}
