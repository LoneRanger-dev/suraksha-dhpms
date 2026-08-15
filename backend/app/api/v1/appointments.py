from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import Appointment, Department, Doctor, Patient, User
from app.models.enums import AppointmentStatus, UserRole
from app.schemas.appointment import AppointmentRead, QueueCheckInRequest
from app.services.queue_service import generate_queue_token

router = APIRouter(prefix="/api/v1/appointments", tags=["appointments"])

QUEUE_ROLES = {UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.RECEPTIONIST}


@router.post("/queue", response_model=AppointmentRead, status_code=status.HTTP_201_CREATED)
async def check_in_to_queue(
    payload: QueueCheckInRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AppointmentRead:
    if current_user.role not in QUEUE_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not permitted to manage the queue")

    patient = await db.get(Patient, payload.patient_id)
    if patient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    doctor = await db.get(Doctor, payload.doctor_id)
    if doctor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

    department = await db.get(Department, doctor.department_id)

    today = date.today()
    token_number = await generate_queue_token(db, department, on_date=today)

    appointment = Appointment(
        patient_id=patient.patient_id,
        doctor_id=doctor.doctor_id,
        appointment_date=today,
        time_slot=datetime.now().strftime("%H:%M"),
        token_number=token_number,
        status=AppointmentStatus.CHECKED_IN,
        reason_for_visit=payload.reason_for_visit,
    )
    db.add(appointment)
    await db.commit()
    await db.refresh(appointment)

    return AppointmentRead.model_validate(appointment)
