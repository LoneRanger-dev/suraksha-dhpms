"use client";

import { useEffect, useState } from "react";

import { API_BASE_URL } from "@/lib/api";
import { useRequireAuth } from "@/lib/use-require-auth";

interface FamilyMember {
  patient_id: string;
  patient_display_id: string;
  full_name: string;
  dob: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  relationship_to_primary: string;
  blood_group: string | null;
  known_allergies: string;
}

const RELATIONSHIPS = ["SPOUSE", "CHILD", "PARENT", "OTHER"];

const inputClass =
  "rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

export default function PatientFamilyPage() {
  const { token } = useRequireAuth(["PATIENT"]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);

  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "OTHER">("MALE");
  const [relationship, setRelationship] = useState(RELATIONSHIPS[0]);
  const [bloodGroup, setBloodGroup] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE_URL}/api/v1/patients/me/family`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setMembers(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleAddMember(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/patients/me/family`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          full_name: fullName,
          dob,
          gender,
          relationship_to_primary: relationship,
          blood_group: bloodGroup || undefined,
        }),
      });
      if (!response.ok) throw new Error("Failed to add family member");
      const member: FamilyMember = await response.json();
      setMembers((prev) => [...prev, member]);
      setFullName("");
      setDob("");
      setGender("MALE");
      setRelationship(RELATIONSHIPS[0]);
      setBloodGroup("");
    } catch {
      setError("Could not add this family member. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!token) {
    return null;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold text-foreground">Family Members</h1>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : members.length === 0 ? (
        <p className="text-sm text-muted-foreground">No family members added yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {members.map((member) => (
            <li
              key={member.patient_id}
              className="flex items-center justify-between rounded-md border border-border p-3"
            >
              <div>
                <p className="text-sm font-semibold text-foreground">{member.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {member.relationship_to_primary} · {member.patient_display_id}
                </p>
              </div>
              {member.blood_group && (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
                  {member.blood_group}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAddMember} className="flex flex-col gap-4 rounded-lg border border-border p-4">
        <h2 className="text-sm font-semibold text-foreground">Add a Family Member</h2>

        <div className="flex flex-col gap-1">
          <label htmlFor="member_full_name" className="text-sm font-medium text-foreground">
            Full Name
          </label>
          <input
            id="member_full_name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className={inputClass}
            required
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="member_dob" className="text-sm font-medium text-foreground">
            Date of Birth
          </label>
          <input
            id="member_dob"
            type="date"
            value={dob}
            onChange={(event) => setDob(event.target.value)}
            className={inputClass}
            required
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="member_gender" className="text-sm font-medium text-foreground">
            Gender
          </label>
          <select
            id="member_gender"
            value={gender}
            onChange={(event) => setGender(event.target.value as "MALE" | "FEMALE" | "OTHER")}
            className={inputClass}
          >
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="member_relationship" className="text-sm font-medium text-foreground">
            Relationship
          </label>
          <select
            id="member_relationship"
            value={relationship}
            onChange={(event) => setRelationship(event.target.value)}
            className={inputClass}
          >
            {RELATIONSHIPS.map((rel) => (
              <option key={rel} value={rel}>
                {rel}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="member_blood_group" className="text-sm font-medium text-foreground">
            Blood Group (optional)
          </label>
          <input
            id="member_blood_group"
            placeholder="e.g. B+"
            value={bloodGroup}
            onChange={(event) => setBloodGroup(event.target.value)}
            className={inputClass}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-fit rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          Add Family Member
        </button>
      </form>
    </main>
  );
}
