import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class VitalsInput(BaseModel):
    bp: str | None = None
    pulse: int | None = None
    temp_f: float | None = None
    spo2: int | None = None
    weight_kg: float | None = None


class VisitCreate(BaseModel):
    appointment_id: uuid.UUID | None = None
    patient_id: uuid.UUID
    chief_complaint: str
    symptoms: list[str] = []
    vitals: VitalsInput | None = None
    diagnosis: str
    doctor_notes: str | None = None
    follow_up_date: date | None = None


class VisitRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    visit_id: uuid.UUID
    patient_id: uuid.UUID
    doctor_id: uuid.UUID
    chief_complaint: str
    diagnosis: str
    visit_date: datetime
    follow_up_date: date | None = None


class FollowUpItem(BaseModel):
    visit_id: uuid.UUID
    patient_id: uuid.UUID
    patient_display_id: str
    patient_full_name: str
    diagnosis: str
    follow_up_date: date
