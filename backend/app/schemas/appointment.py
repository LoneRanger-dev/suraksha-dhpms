import uuid
from datetime import date

from pydantic import BaseModel, ConfigDict

from app.models.enums import AppointmentStatus


class QueueCheckInRequest(BaseModel):
    patient_id: uuid.UUID
    doctor_id: uuid.UUID
    reason_for_visit: str | None = None


class AppointmentBookRequest(BaseModel):
    doctor_id: uuid.UUID
    appointment_date: date
    time_slot: str
    reason_for_visit: str | None = None
    patient_id: uuid.UUID | None = None


class AppointmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    appointment_id: uuid.UUID
    patient_id: uuid.UUID
    doctor_id: uuid.UUID
    appointment_date: date
    time_slot: str
    token_number: str
    status: AppointmentStatus


class AppointmentQueueItem(BaseModel):
    appointment_id: uuid.UUID
    patient_id: uuid.UUID
    patient_display_id: str
    patient_full_name: str
    doctor_id: uuid.UUID
    doctor_full_name: str
    token_number: str
    time_slot: str
    appointment_date: date
    status: AppointmentStatus
