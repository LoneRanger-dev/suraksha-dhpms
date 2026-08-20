import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import Appointment, Doctor, Patient, Prescription, PrescriptionItem, User, Visit
from app.models.enums import AppointmentStatus, UserRole
from app.schemas.prescription import PrescriptionCreate, PrescriptionRead
from app.schemas.visit import FollowUpItem, VisitCreate, VisitRead
from app.services.audit_service import record_audit
from app.services.prescription_pdf_service import generate_prescription_pdf

router = APIRouter(prefix="/api/v1/consultations", tags=["consultations"])

HISTORY_VIEW_ROLES = {UserRole.DOCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.NURSE}
PRESCRIPTION_VIEW_ROLES = {UserRole.PHARMACIST, UserRole.DOCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.NURSE}
DISPENSE_ROLES = {UserRole.PHARMACIST, UserRole.ADMIN, UserRole.SUPER_ADMIN}


async def _require_doctor(db: AsyncSession, current_user: User) -> Doctor:
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only doctors can perform this action")
    result = await db.execute(select(Doctor).where(Doctor.user_id == current_user.user_id))
    doctor = result.scalar_one_or_none()
    if doctor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor profile not found")
    return doctor


@router.post("/visits", response_model=VisitRead, status_code=status.HTTP_201_CREATED)
async def record_visit(
    payload: VisitCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> VisitRead:
    doctor = await _require_doctor(db, current_user)

    patient = await db.get(Patient, payload.patient_id)
    if patient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    visit = Visit(
        appointment_id=payload.appointment_id,
        patient_id=patient.patient_id,
        doctor_id=doctor.doctor_id,
        chief_complaint=payload.chief_complaint,
        symptoms=payload.symptoms,
        vitals=payload.vitals.model_dump(exclude_none=True) if payload.vitals else None,
        diagnosis=payload.diagnosis,
        doctor_notes=payload.doctor_notes,
        follow_up_date=payload.follow_up_date,
        lab_tests_ordered=payload.lab_tests_ordered,
    )
    db.add(visit)

    if payload.appointment_id is not None:
        appointment = await db.get(Appointment, payload.appointment_id)
        if appointment is not None:
            appointment.status = AppointmentStatus.COMPLETED

    await db.commit()
    await db.refresh(visit)

    await record_audit(
        db,
        performed_by=current_user.user_id,
        action="CREATE",
        entity_affected="visit",
        entity_id=visit.visit_id,
    )

    return VisitRead.model_validate(visit)


@router.post(
    "/visits/{visit_id}/prescriptions", response_model=PrescriptionRead, status_code=status.HTTP_201_CREATED
)
async def create_prescription(
    visit_id: uuid.UUID,
    payload: PrescriptionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PrescriptionRead:
    doctor = await _require_doctor(db, current_user)

    visit = await db.get(Visit, visit_id)
    if visit is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found")

    prescription = Prescription(
        visit_id=visit.visit_id,
        patient_id=visit.patient_id,
        doctor_id=doctor.doctor_id,
        instructions=payload.instructions,
    )
    for item in payload.items:
        prescription.items.append(
            PrescriptionItem(
                medicine_name=item.medicine_name,
                dosage=item.dosage,
                frequency=item.frequency,
                duration=item.duration,
                intake_instructions=item.intake_instructions,
            )
        )
    db.add(prescription)
    await db.commit()

    await record_audit(
        db,
        performed_by=current_user.user_id,
        action="CREATE",
        entity_affected="prescription",
        entity_id=prescription.prescription_id,
    )

    return PrescriptionRead.model_validate(prescription)


@router.get("/patients/{patient_id}/history", response_model=list[VisitRead])
async def get_patient_history(
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[VisitRead]:
    if current_user.role not in HISTORY_VIEW_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not permitted to view medical history")

    result = await db.execute(select(Visit).where(Visit.patient_id == patient_id).order_by(Visit.visit_date.desc()))
    visits = result.scalars().all()

    await record_audit(
        db,
        performed_by=current_user.user_id,
        action="READ",
        entity_affected="patient_history",
        entity_id=patient_id,
    )

    return [VisitRead.model_validate(v) for v in visits]


@router.get("/follow-ups", response_model=list[FollowUpItem])
async def list_my_follow_ups(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[FollowUpItem]:
    doctor = await _require_doctor(db, current_user)

    result = await db.execute(
        select(Visit)
        .options(selectinload(Visit.patient))
        .where(Visit.doctor_id == doctor.doctor_id, Visit.follow_up_date.is_not(None))
        .order_by(Visit.follow_up_date)
    )
    visits = result.scalars().all()

    return [
        FollowUpItem(
            visit_id=visit.visit_id,
            patient_id=visit.patient_id,
            patient_display_id=visit.patient.patient_display_id,
            patient_full_name=visit.patient.full_name,
            diagnosis=visit.diagnosis,
            follow_up_date=visit.follow_up_date,
        )
        for visit in visits
    ]


@router.get("/patients/{patient_id}/prescriptions", response_model=list[PrescriptionRead])
async def get_patient_prescriptions(
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[PrescriptionRead]:
    if current_user.role not in PRESCRIPTION_VIEW_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not permitted to view prescriptions")

    result = await db.execute(
        select(Prescription)
        .options(selectinload(Prescription.items))
        .where(Prescription.patient_id == patient_id)
        .order_by(Prescription.created_at.desc())
    )
    return [PrescriptionRead.model_validate(rx) for rx in result.scalars().all()]


@router.post("/prescriptions/{prescription_id}/dispense", response_model=PrescriptionRead)
async def dispense_prescription(
    prescription_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PrescriptionRead:
    if current_user.role not in DISPENSE_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not permitted to dispense prescriptions")

    result = await db.execute(
        select(Prescription).options(selectinload(Prescription.items)).where(
            Prescription.prescription_id == prescription_id
        )
    )
    prescription = result.scalar_one_or_none()
    if prescription is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prescription not found")

    prescription.dispensed = True
    prescription.dispensed_at = datetime.now(timezone.utc)
    await db.commit()

    await record_audit(
        db,
        performed_by=current_user.user_id,
        action="UPDATE",
        entity_affected="prescription",
        entity_id=prescription.prescription_id,
    )

    return PrescriptionRead.model_validate(prescription)


@router.get("/prescriptions/{prescription_id}/pdf")
async def download_prescription_pdf(
    prescription_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    prescription = await db.get(Prescription, prescription_id)
    if prescription is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prescription not found")

    patient = await db.get(Patient, prescription.patient_id)
    doctor = await db.get(Doctor, prescription.doctor_id)

    pdf_bytes = generate_prescription_pdf(patient, doctor, prescription)
    return Response(content=pdf_bytes, media_type="application/pdf")
