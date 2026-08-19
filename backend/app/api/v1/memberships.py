from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import MembershipPlan, User
from app.models.enums import UserRole
from app.schemas.membership import MembershipPlanAdminRead, MembershipPlanCreate
from app.schemas.patient import MembershipPlanRead

router = APIRouter(prefix="/api/v1/membership-plans", tags=["membership-plans"])

ADMIN_ROLES = {UserRole.SUPER_ADMIN, UserRole.ADMIN}


@router.get("", response_model=list[MembershipPlanRead])
async def list_membership_plans(db: AsyncSession = Depends(get_db)) -> list[MembershipPlanRead]:
    result = await db.execute(select(MembershipPlan).where(MembershipPlan.is_active.is_(True)))
    plans = result.scalars().all()
    return [MembershipPlanRead.model_validate(plan) for plan in plans]


@router.post("", response_model=MembershipPlanAdminRead, status_code=status.HTTP_201_CREATED)
async def create_membership_plan(
    payload: MembershipPlanCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MembershipPlanAdminRead:
    if current_user.role not in ADMIN_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not permitted to manage membership plans")

    plan = MembershipPlan(
        name=payload.name,
        tier=payload.tier,
        price=payload.price,
        validity_days=payload.validity_days,
        consultation_discount_pct=payload.consultation_discount_pct,
        lab_discount_pct=payload.lab_discount_pct,
        pharmacy_discount_pct=payload.pharmacy_discount_pct,
    )
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return MembershipPlanAdminRead.model_validate(plan)
