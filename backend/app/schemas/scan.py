import uuid

from pydantic import BaseModel


class PublicScanView(BaseModel):
    full_name: str
    blood_group: str | None
    allergies: str
    emergency_contact_phone: str


class StaffScanView(BaseModel):
    patient_id: uuid.UUID
    patient_display_id: str
    full_name: str
    dob: str
    gender: str
    blood_group: str | None
    allergies: str
    membership_tier: str
    card_status: str
