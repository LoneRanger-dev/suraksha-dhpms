import uuid
from datetime import datetime

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


class VisitRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    visit_id: uuid.UUID
    patient_id: uuid.UUID
    doctor_id: uuid.UUID
    chief_complaint: str
    diagnosis: str
    visit_date: datetime
