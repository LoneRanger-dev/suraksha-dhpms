import uuid
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import Appointment, Department, Doctor, Patient, User
from app.models.enums import AppointmentStatus, UserRole
from app.schemas.appointment import AppointmentBookRequest, AppointmentQueueItem, AppointmentRead, QueueCheckInRequest
from app.services.queue_service import generate_queue_token

router = APIRouter(prefix="/api/v1/appointments", tags=["appointments"])

QUEUE_ROLES = {UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.RECEPTIONIST}
QUEUE_VIEW_ROLES = {UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.DOCTOR, UserRole.NURSE}
BOOKING_ROLES = {UserRole.PATIENT, UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.RECEPTIONIST}


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


@router.post("/book", response_model=AppointmentRead, status_code=status.HTTP_201_CREATED)
async def book_appointment(
    payload: AppointmentBookRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AppointmentRead:
    if current_user.role not in BOOKING_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not permitted to book appointments")

    if current_user.role == UserRole.PATIENT:
        own_patient = (
            await db.execute(select(Patient).where(Patient.user_id == current_user.user_id))
        ).scalar_one_or_none()
        if own_patient is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No patient profile for this account")

        if payload.patient_id is None or payload.patient_id == own_patient.patient_id:
            target_patient_id = own_patient.patient_id
        else:
            dependent = await db.get(Patient, payload.patient_id)
            if dependent is None or dependent.primary_account_id != own_patient.patient_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN, detail="Cannot book an appointment for this patient"
                )
            target_patient_id = payload.patient_id
    else:
        if payload.patient_id is None:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="patient_id is required")
        target_patient_id = payload.patient_id

    patient = await db.get(Patient, target_patient_id)
    if patient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    doctor = await db.get(Doctor, payload.doctor_id)
    if doctor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

    department = await db.get(Department, doctor.department_id)
    token_number = await generate_queue_token(db, department, on_date=payload.appointment_date)

    appointment = Appointment(
        patient_id=patient.patient_id,
        doctor_id=doctor.doctor_id,
        appointment_date=payload.appointment_date,
        time_slot=payload.time_slot,
        token_number=token_number,
        status=AppointmentStatus.SCHEDULED,
        reason_for_visit=payload.reason_for_visit,
    )
    db.add(appointment)
    await db.commit()
    await db.refresh(appointment)

    return AppointmentRead.model_validate(appointment)


@router.get("", response_model=list[AppointmentQueueItem])
async def list_queue(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    on_date: date | None = None,
    doctor_id: uuid.UUID | None = None,
) -> list[AppointmentQueueItem]:
    if current_user.role not in QUEUE_VIEW_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not permitted to view the queue")

    target_date = on_date or date.today()

    if current_user.role == UserRole.DOCTOR:
        result = await db.execute(select(Doctor).where(Doctor.user_id == current_user.user_id))
        own_doctor = result.scalar_one_or_none()
        if own_doctor is None:
            return []
        doctor_id = own_doctor.doctor_id

    query = (
        select(Appointment)
        .options(selectinload(Appointment.patient), selectinload(Appointment.doctor))
        .where(Appointment.appointment_date == target_date)
        .order_by(Appointment.time_slot)
    )
    if doctor_id is not None:
        query = query.where(Appointment.doctor_id == doctor_id)

    result = await db.execute(query)
    appointments = result.scalars().all()

    return [
        AppointmentQueueItem(
            appointment_id=appt.appointment_id,
            patient_id=appt.patient_id,
            patient_display_id=appt.patient.patient_display_id,
            patient_full_name=appt.patient.full_name,
            doctor_id=appt.doctor_id,
            doctor_full_name=appt.doctor.full_name,
            token_number=appt.token_number,
            time_slot=appt.time_slot,
            appointment_date=appt.appointment_date,
            status=appt.status,
        )
        for appt in appointments
    ]
