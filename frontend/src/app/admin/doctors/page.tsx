"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { API_BASE_URL } from "@/lib/api";
import { useRequireAuth } from "@/lib/use-require-auth";

interface DoctorItem {
  doctor_id: string;
  full_name: string;
  specialization: string;
  department_name: string;
  consultation_fee: string;
}

interface DepartmentItem {
  department_id: string;
  name: string;
  description: string | null;
}

const inputClass =
  "rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

export default function AdminDoctorsPage() {
  const { token } = useRequireAuth(ADMIN_ROLES);
  const [doctors, setDoctors] = useState<DoctorItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [deptName, setDeptName] = useState("");
  const [deptSaving, setDeptSaving] = useState(false);
  const [deptError, setDeptError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [qualification, setQualification] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [consultationFee, setConsultationFee] = useState("500.00");
  const [docSaving, setDocSaving] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      fetch(`${API_BASE_URL}/api/v1/doctors`).then((res) => (res.ok ? res.json() : [])),
      fetch(`${API_BASE_URL}/api/v1/departments`).then((res) => (res.ok ? res.json() : [])),
    ])
      .then(([docs, depts]) => {
        setDoctors(Array.isArray(docs) ? docs : []);
        setDepartments(Array.isArray(depts) ? depts : []);
        if (Array.isArray(depts) && depts.length > 0) setDepartmentId(depts[0].department_id);
      })
      .finally(() => setLoading(false));
  }, [token]);

  async function handleAddDepartment(event: React.FormEvent) {
    event.preventDefault();
    setDeptError(null);
    setDeptSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/departments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: deptName }),
      });
      if (!response.ok) throw new Error("Failed to add department");
      const dept: DepartmentItem = await response.json();
      setDepartments((prev) => [...prev, dept]);
      setDepartmentId(dept.department_id);
      setDeptName("");
    } catch {
      setDeptError("Could not add this department.");
    } finally {
      setDeptSaving(false);
    }
  }

  async function handleAddDoctor(event: React.FormEvent) {
    event.preventDefault();
    setDocError(null);
    setDocSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/doctors`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          full_name: fullName,
          phone,
          password,
          qualification,
          specialization,
          department_id: departmentId,
          consultation_fee: consultationFee,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.detail ?? "Failed to add doctor");
      }
      const doctor: DoctorItem = await response.json();
      setDoctors((prev) => [...prev, doctor]);
      setFullName("");
      setPhone("");
      setPassword("");
      setQualification("");
      setSpecialization("");
      setConsultationFee("500.00");
    } catch (error) {
      setDocError(error instanceof Error ? error.message : "Could not add this doctor.");
    } finally {
      setDocSaving(false);
    }
  }

  if (!token) {
    return null;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Doctors & Departments</h1>
        <div className="flex items-center gap-3">
          <Link href="/admin/patients" className="text-sm text-muted-foreground underline">
            Patients
          </Link>
          <Link href="/admin/memberships" className="text-sm text-muted-foreground underline">
            Membership Plans
          </Link>
          <Link href="/admin/billing" className="text-sm text-muted-foreground underline">
            Billing
          </Link>
          <Link href="/admin/audit-logs" className="text-sm text-muted-foreground underline">
            Audit Logs
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-foreground">Doctors</h2>
          {doctors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No doctors added yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {doctors.map((doctor) => (
                <li key={doctor.doctor_id} className="rounded-md border border-border p-3">
                  <p className="text-sm font-semibold text-foreground">{doctor.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {doctor.specialization} · {doctor.department_name} · ₹{doctor.consultation_fee}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <form onSubmit={handleAddDepartment} className="flex flex-col gap-4 rounded-lg border border-border p-4">
        <h2 className="text-sm font-semibold text-foreground">Add a Department</h2>
        <div className="flex flex-col gap-1">
          <label htmlFor="dept_name" className="text-sm font-medium text-foreground">
            Department Name
          </label>
          <input
            id="dept_name"
            value={deptName}
            onChange={(event) => setDeptName(event.target.value)}
            className={inputClass}
            required
          />
        </div>
        {deptError && <p className="text-sm text-destructive">{deptError}</p>}
        <button
          type="submit"
          disabled={deptSaving}
          className="w-fit rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground disabled:opacity-50"
        >
          Add Department
        </button>
      </form>

      <form onSubmit={handleAddDoctor} className="flex flex-col gap-4 rounded-lg border border-border p-4">
        <h2 className="text-sm font-semibold text-foreground">Add a Doctor</h2>

        <div className="flex flex-col gap-1">
          <label htmlFor="doc_full_name" className="text-sm font-medium text-foreground">
            Full Name
          </label>
          <input
            id="doc_full_name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className={inputClass}
            required
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="doc_phone" className="text-sm font-medium text-foreground">
            Phone Number (used to log in)
          </label>
          <input
            id="doc_phone"
            placeholder="e.g., +91 98765 43210"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className={inputClass}
            required
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="doc_password" className="text-sm font-medium text-foreground">
            Password
          </label>
          <input
            id="doc_password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClass}
            required
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="doc_qualification" className="text-sm font-medium text-foreground">
            Qualification
          </label>
          <input
            id="doc_qualification"
            placeholder="e.g., MBBS, MD"
            value={qualification}
            onChange={(event) => setQualification(event.target.value)}
            className={inputClass}
            required
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="doc_specialization" className="text-sm font-medium text-foreground">
            Specialization
          </label>
          <input
            id="doc_specialization"
            value={specialization}
            onChange={(event) => setSpecialization(event.target.value)}
            className={inputClass}
            required
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="doc_department" className="text-sm font-medium text-foreground">
            Department
          </label>
          <select
            id="doc_department"
            value={departmentId}
            onChange={(event) => setDepartmentId(event.target.value)}
            className={inputClass}
          >
            {departments.length === 0 && <option value="">No departments yet</option>}
            {departments.map((dept) => (
              <option key={dept.department_id} value={dept.department_id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="doc_fee" className="text-sm font-medium text-foreground">
            Consultation Fee (₹)
          </label>
          <input
            id="doc_fee"
            type="number"
            step="0.01"
            value={consultationFee}
            onChange={(event) => setConsultationFee(event.target.value)}
            className={inputClass}
          />
        </div>

        {docError && <p className="text-sm text-destructive">{docError}</p>}

        <button
          type="submit"
          disabled={docSaving || !departmentId}
          className="w-fit rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          Add Doctor
        </button>
      </form>
    </main>
  );
}
