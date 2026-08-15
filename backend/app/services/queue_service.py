from datetime import date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Appointment, Department, Doctor


async def generate_queue_token(db: AsyncSession, department: Department, on_date: date | None = None) -> str:
    """Issues an OPD queue token like CARDIO-001, sequential per department per day."""
    target_date = on_date or date.today()
    code = department.name[:6].upper().replace(" ", "")

    result = await db.execute(
        select(func.count())
        .select_from(Appointment)
        .join(Doctor, Appointment.doctor_id == Doctor.doctor_id)
        .where(Doctor.department_id == department.department_id, Appointment.appointment_date == target_date)
    )
    count = result.scalar_one()
    return f"{code}-{count + 1:03d}"
