import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import MembershipPlan, Patient, QRCard
from app.schemas.patient import PatientCreate, PatientRead, QRCardRead
from app.services.patient_id_service import generate_patient_display_id
from app.services.qr_service import issue_qr_card

router = APIRouter(prefix="/api/v1/patients", tags=["patients"])


async def _get_plan_or_404(db: AsyncSession, plan_id: uuid.UUID) -> MembershipPlan:
    plan = await db.get(MembershipPlan, plan_id)
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membership plan not found")
    return plan


def _to_patient_read(patient: Patient, card: QRCard) -> PatientRead:
    return PatientRead(
        patient_id=patient.patient_id,
        patient_display_id=patient.patient_display_id,
        full_name=patient.full_name,
        dob=patient.dob,
        gender=patient.gender,
        blood_group=patient.blood_group,
        known_allergies=patient.known_allergies,
        emergency_contact_phone=patient.emergency_contact_phone,
        created_at=patient.created_at,
        qr_card=QRCardRead.model_validate(card),
    )


@router.post("", response_model=PatientRead, status_code=status.HTTP_201_CREATED)
async def register_patient(payload: PatientCreate, db: AsyncSession = Depends(get_db)) -> PatientRead:
    plan = await _get_plan_or_404(db, payload.plan_id)

    display_id = await generate_patient_display_id(db)
    patient = Patient(
        patient_display_id=display_id,
        full_name=payload.full_name,
        dob=payload.dob,
        gender=payload.gender,
        blood_group=payload.blood_group,
        abha_id=payload.abha_id,
        address=payload.address,
        emergency_contact_name=payload.emergency_contact_name,
        emergency_contact_phone=payload.emergency_contact_phone,
        known_allergies=payload.known_allergies,
        existing_conditions=payload.existing_conditions,
    )
    db.add(patient)
    await db.flush()

    card = await issue_qr_card(db, patient, plan)
    await db.commit()
    await db.refresh(patient)
    await db.refresh(card)

    return _to_patient_read(patient, card)


@router.get("/{patient_id}", response_model=PatientRead)
async def get_patient(patient_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> PatientRead:
    patient = await db.get(Patient, patient_id)
    if patient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    result = await db.execute(
        select(QRCard)
        .where(QRCard.patient_id == patient_id)
        .order_by(QRCard.issued_date.desc(), QRCard.created_at.desc())
    )
    card = result.scalars().first()
    if card is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient has no QR card")

    return _to_patient_read(patient, card)
