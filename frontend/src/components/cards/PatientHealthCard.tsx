type Gender = "MALE" | "FEMALE" | "OTHER";
type MembershipTier = "FREE" | "SILVER" | "GOLD" | "PLATINUM";

interface PatientHealthCardProps {
  fullName: string;
  patientDisplayId: string;
  dob: string;
  gender: Gender;
  bloodGroup?: string;
  allergies: string;
  membershipTier: MembershipTier;
  validThru: string;
  emergencyPhone: string;
  hospitalName?: string;
}

function calculateAge(dob: string): number {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age;
}

export function PatientHealthCard({
  fullName,
  patientDisplayId,
  dob,
  gender,
  bloodGroup,
  allergies,
  membershipTier,
  validThru,
  emergencyPhone,
  hospitalName = "Suraksha Super Specialty Hospital",
}: PatientHealthCardProps) {
  const hasAllergies = allergies.trim().toUpperCase() !== "NONE";
  const age = calculateAge(dob);
  const validThruLabel = new Date(validThru).toLocaleDateString("en-IN", {
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="aspect-[85.6/53.98] w-full max-w-sm overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between bg-primary px-3 py-1.5 text-primary-foreground">
        <span className="text-[10px] font-bold uppercase tracking-wide">{hospitalName}</span>
        <span className="text-[9px] font-semibold uppercase">{membershipTier} Member</span>
      </div>
      <div className="flex gap-3 p-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-muted text-[8px] text-muted-foreground">
          QR
        </div>
        <div className="flex flex-col gap-0.5 text-[10px] text-foreground">
          <span className="text-xs font-bold">{fullName}</span>
          <span>PATIENT ID: {patientDisplayId}</span>
          <span>
            DOB/AGE: {dob} ({age} Y) GENDER: {gender.charAt(0)}
          </span>
          <span>
            BLOOD GP: {bloodGroup ?? "—"} VALID THRU: {validThruLabel}
          </span>
          <span className={hasAllergies ? "font-semibold text-destructive" : "text-muted-foreground"}>
            ALLERGIES: {allergies}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-border px-3 py-1 text-[8px] text-muted-foreground">
        <span>24x7 EMERGENCY: {emergencyPhone}</span>
        <span>app.suraksha.com/scan</span>
      </div>
    </div>
  );
}
