import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.security import hash_password
from app.models import Appointment, MembershipPlan, Patient, QRCard, User
from app.models.enums import UserRole
from app.schemas.appointment import AppointmentQueueItem
from app.schemas.patient import FamilyMemberCreate, FamilyMemberRead, PatientCreate, PatientMeRead, PatientRead, QRCardRead
from app.services.patient_id_service import generate_patient_display_id
from app.services.qr_service import issue_qr_card

router = APIRouter(prefix="/api/v1/patients", tags=["patients"])


async def _get_plan_or_404(db: AsyncSession, plan_id: uuid.UUID) -> MembershipPlan:
    plan = await db.get(MembershipPlan, plan_id)
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membership plan not found")
    return plan


async def _get_own_patient_or_404(db: AsyncSession, current_user: User) -> Patient:
    result = await db.execute(select(Patient).where(Patient.user_id == current_user.user_id))
    patient = result.scalar_one_or_none()
    if patient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No patient profile for this account")
    return patient


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
    patient = await _get_own_patient_or_404(db, current_user)

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


@router.post("/me/family", response_model=FamilyMemberRead, status_code=status.HTTP_201_CREATED)
async def add_family_member(
    payload: FamilyMemberCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FamilyMemberRead:
    primary = await _get_own_patient_or_404(db, current_user)

    card_result = await db.execute(
        select(QRCard)
        .where(QRCard.patient_id == primary.patient_id)
        .order_by(QRCard.issued_date.desc(), QRCard.created_at.desc())
    )
    primary_card = card_result.scalars().first()
    if primary_card is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Primary account has no active membership")
    plan = await db.get(MembershipPlan, primary_card.plan_id)

    display_id = await generate_patient_display_id(db)
    dependent = Patient(
        primary_account_id=primary.patient_id,
        relationship_to_primary=payload.relationship_to_primary.value,
        patient_display_id=display_id,
        full_name=payload.full_name,
        dob=payload.dob,
        gender=payload.gender,
        blood_group=payload.blood_group,
        known_allergies=payload.known_allergies,
        emergency_contact_phone=payload.emergency_contact_phone or primary.emergency_contact_phone,
    )
    db.add(dependent)
    await db.flush()

    await issue_qr_card(db, dependent, plan)
    await db.commit()
    await db.refresh(dependent)

    return FamilyMemberRead.model_validate(dependent)


@router.get("/me/family", response_model=list[FamilyMemberRead])
async def list_family_members(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[FamilyMemberRead]:
    primary = await _get_own_patient_or_404(db, current_user)

    result = await db.execute(
        select(Patient).where(Patient.primary_account_id == primary.patient_id).order_by(Patient.created_at)
    )
    dependents = result.scalars().all()
    return [FamilyMemberRead.model_validate(dependent) for dependent in dependents]


@router.get("/me/appointments", response_model=list[AppointmentQueueItem])
async def list_my_appointments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AppointmentQueueItem]:
    primary = await _get_own_patient_or_404(db, current_user)

    dependents_result = await db.execute(
        select(Patient.patient_id).where(Patient.primary_account_id == primary.patient_id)
    )
    patient_ids = [primary.patient_id] + [row[0] for row in dependents_result.all()]

    result = await db.execute(
        select(Appointment)
        .options(selectinload(Appointment.patient), selectinload(Appointment.doctor))
        .where(Appointment.patient_id.in_(patient_ids))
        .order_by(Appointment.appointment_date.desc(), Appointment.time_slot.desc())
    )
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
