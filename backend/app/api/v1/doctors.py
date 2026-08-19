from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.security import hash_password
from app.models import Department, Doctor, User
from app.models.enums import UserRole
from app.schemas.doctor import DoctorCreate, DoctorRead

router = APIRouter(prefix="/api/v1/doctors", tags=["doctors"])

ADMIN_ROLES = {UserRole.SUPER_ADMIN, UserRole.ADMIN}


def _to_doctor_read(doctor: Doctor) -> DoctorRead:
    return DoctorRead(
        doctor_id=doctor.doctor_id,
        full_name=doctor.full_name,
        specialization=doctor.specialization,
        department_name=doctor.department.name,
        consultation_fee=doctor.consultation_fee,
    )


@router.get("", response_model=list[DoctorRead])
async def list_doctors(db: AsyncSession = Depends(get_db)) -> list[DoctorRead]:
    result = await db.execute(select(Doctor).options(selectinload(Doctor.department)))
    return [_to_doctor_read(doctor) for doctor in result.scalars().all()]


@router.post("", response_model=DoctorRead, status_code=status.HTTP_201_CREATED)
async def create_doctor(
    payload: DoctorCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DoctorRead:
    if current_user.role not in ADMIN_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not permitted to manage doctors")

    department = await db.get(Department, payload.department_id)
    if department is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")

    existing_user = (await db.execute(select(User).where(User.phone == payload.phone))).scalar_one_or_none()
    if existing_user is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Phone number already registered")

    user = User(phone=payload.phone, password_hash=hash_password(payload.password), role=UserRole.DOCTOR)
    db.add(user)
    await db.flush()

    doctor = Doctor(
        user_id=user.user_id,
        department_id=department.department_id,
        full_name=payload.full_name,
        qualification=payload.qualification,
        specialization=payload.specialization,
        consultation_fee=payload.consultation_fee,
    )
    db.add(doctor)
    await db.commit()
    await db.refresh(doctor)
    doctor.department = department

    return _to_doctor_read(doctor)
