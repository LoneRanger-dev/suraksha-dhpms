from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models import Doctor
from app.schemas.doctor import DoctorRead

router = APIRouter(prefix="/api/v1/doctors", tags=["doctors"])


@router.get("", response_model=list[DoctorRead])
async def list_doctors(db: AsyncSession = Depends(get_db)) -> list[DoctorRead]:
    result = await db.execute(select(Doctor).options(selectinload(Doctor.department)))
    doctors = result.scalars().all()
    return [
        DoctorRead(
            doctor_id=doctor.doctor_id,
            full_name=doctor.full_name,
            specialization=doctor.specialization,
            department_name=doctor.department.name,
            consultation_fee=doctor.consultation_fee,
        )
        for doctor in doctors
    ]
