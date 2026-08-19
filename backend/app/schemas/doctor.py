import uuid
from decimal import Decimal

from pydantic import BaseModel, Field


class DoctorRead(BaseModel):
    doctor_id: uuid.UUID
    full_name: str
    specialization: str
    department_name: str
    consultation_fee: Decimal


class DoctorCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=150)
    phone: str = Field(pattern=r"^\+?[1-9]\d{9,14}$")
    password: str = Field(min_length=6, max_length=100)
    qualification: str = Field(min_length=1, max_length=100)
    specialization: str = Field(min_length=1, max_length=100)
    department_id: uuid.UUID
    consultation_fee: Decimal = Decimal("500.00")
