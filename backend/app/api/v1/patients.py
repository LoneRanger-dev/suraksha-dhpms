import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.security import hash_password
from app.models import MembershipPlan, Patient, QRCard, User
from app.models.enums import UserRole
from app.schemas.patient import PatientCreate, PatientMeRead, PatientRead, QRCardRead
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

    existing_user = (await db.execute(select(User).where(User.phone == payload.phone))).scalar_one_or_none()
    if existing_user is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Phone number already registered")

    user = User(phone=payload.phone, password_hash=hash_password(payload.password), role=UserRole.PATIENT)
    db.add(user)
    await db.flush()

    display_id = await generate_patient_display_id(db)
    patient = Patient(
        user_id=user.user_id,
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


@router.get("/me", response_model=PatientMeRead)
async def get_my_patient_record(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PatientMeRead:
    result = await db.execute(select(Patient).where(Patient.user_id == current_user.user_id))
    patient = result.scalar_one_or_none()
    if patient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No patient profile for this account")

    card_result = await db.execute(
        select(QRCard)
        .where(QRCard.patient_id == patient.patient_id)
        .order_by(QRCard.issued_date.desc(), QRCard.created_at.desc())
    )
    card = card_result.scalars().first()
    if card is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient has no QR card")

    plan = await db.get(MembershipPlan, card.plan_id)

    return PatientMeRead(
        patient_id=patient.patient_id,
        patient_display_id=patient.patient_display_id,
        full_name=patient.full_name,
        dob=patient.dob,
        gender=patient.gender,
        blood_group=patient.blood_group,
        known_allergies=patient.known_allergies,
        emergency_contact_phone=patient.emergency_contact_phone,
        qr_card=QRCardRead.model_validate(card),
        membership_tier=plan.tier,
        membership_plan_name=plan.name,
    )


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
