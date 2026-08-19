import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import CardStatus, GenderType, MembershipTier, RelationshipType


class QRCardRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    card_id: uuid.UUID
    token_uuid: uuid.UUID
    status: CardStatus
    issued_date: date
    expiry_date: date


class PatientCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=150)
    dob: date
    gender: GenderType
    phone: str = Field(pattern=r"^\+?[1-9]\d{9,14}$")
    password: str = Field(min_length=6, max_length=100)
    emergency_contact_phone: str = Field(pattern=r"^\+?[1-9]\d{9,14}$")
    plan_id: uuid.UUID
    blood_group: str | None = Field(default=None, max_length=5)
    abha_id: str | None = None
    address: str | None = None
    emergency_contact_name: str | None = None
    known_allergies: str = "None"
    existing_conditions: str | None = None


class PatientRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    patient_id: uuid.UUID
    patient_display_id: str
    full_name: str
    dob: date
    gender: GenderType
    blood_group: str | None
    known_allergies: str
    emergency_contact_phone: str
    created_at: datetime
    qr_card: QRCardRead


class PatientListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    patient_id: uuid.UUID
    patient_display_id: str
    full_name: str
    dob: date
    gender: GenderType
    emergency_contact_phone: str
    created_at: datetime


class PatientMeRead(BaseModel):
    patient_id: uuid.UUID
    patient_display_id: str
    full_name: str
    dob: date
    gender: GenderType
    blood_group: str | None
    known_allergies: str
    emergency_contact_phone: str
    qr_card: QRCardRead
    membership_tier: MembershipTier
    membership_plan_name: str


class FamilyMemberCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=150)
    dob: date
    gender: GenderType
    relationship_to_primary: RelationshipType
    blood_group: str | None = Field(default=None, max_length=5)
    known_allergies: str = "None"
    emergency_contact_phone: str | None = Field(default=None, pattern=r"^\+?[1-9]\d{9,14}$")


class FamilyMemberRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    patient_id: uuid.UUID
    patient_display_id: str
    full_name: str
    dob: date
    gender: GenderType
    relationship_to_primary: str
    blood_group: str | None
    known_allergies: str


class MembershipPlanRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    plan_id: uuid.UUID
    name: str
    tier: MembershipTier
