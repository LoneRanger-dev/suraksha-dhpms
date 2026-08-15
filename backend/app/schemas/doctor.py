import uuid
from decimal import Decimal

from pydantic import BaseModel


class DoctorRead(BaseModel):
    doctor_id: uuid.UUID
    full_name: str
    specialization: str
    department_name: str
    consultation_fee: Decimal
