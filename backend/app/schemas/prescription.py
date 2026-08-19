import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PrescriptionItemCreate(BaseModel):
    medicine_name: str
    dosage: str
    frequency: str
    duration: str
    intake_instructions: str | None = None


class PrescriptionCreate(BaseModel):
    instructions: str | None = None
    items: list[PrescriptionItemCreate]


class PrescriptionItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    item_id: uuid.UUID
    medicine_name: str
    dosage: str
    frequency: str
    duration: str
    intake_instructions: str | None


class PrescriptionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    prescription_id: uuid.UUID
    visit_id: uuid.UUID
    patient_id: uuid.UUID
    instructions: str | None
    created_at: datetime
    items: list[PrescriptionItemRead]
