import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user_optional
from app.core.database import get_db
from app.models import MembershipPlan, Patient, QRCard, User
from app.models.enums import UserRole
from app.schemas.scan import PublicScanView, StaffScanView

router = APIRouter(prefix="/api/v1/scan", tags=["scan"])

STAFF_ROLES = {
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.RECEPTIONIST,
    UserRole.DOCTOR,
    UserRole.NURSE,
    UserRole.PHARMACIST,
}


@router.get("/{token}")
async def resolve_scan(
    token: str,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
) -> PublicScanView | StaffScanView:
    card: QRCard | None = None
    try:
        token_uuid = uuid.UUID(token)
    except ValueError:
        token_uuid = None
    if token_uuid is not None:
        result = await db.execute(select(QRCard).where(QRCard.token_uuid == token_uuid))
        card = result.scalar_one_or_none()

    if card is None:
        # Fall back to the human-readable ID printed on the confirmation
        # screen / wristband, since staff type that far more often than the
        # raw QR token.
        result = await db.execute(
            select(QRCard).join(Patient).where(Patient.patient_display_id == token)
        )
        card = result.scalar_one_or_none()

    if card is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid or expired card token")

    patient = await db.get(Patient, card.patient_id)

    if current_user is not None and current_user.role in STAFF_ROLES:
        plan = await db.get(MembershipPlan, card.plan_id)
        return StaffScanView(
            patient_id=patient.patient_id,
            patient_display_id=patient.patient_display_id,
            full_name=patient.full_name,
            dob=patient.dob.isoformat(),
            gender=patient.gender.value,
            blood_group=patient.blood_group,
            allergies=patient.known_allergies,
            membership_tier=plan.tier.value,
            card_status=card.status.value,
        )

    return PublicScanView(
        full_name=patient.full_name,
        blood_group=patient.blood_group,
        allergies=patient.known_allergies,
        emergency_contact_phone=patient.emergency_contact_phone,
    )
