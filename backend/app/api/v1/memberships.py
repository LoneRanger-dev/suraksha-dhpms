from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import MembershipPlan
from app.schemas.patient import MembershipPlanRead

router = APIRouter(prefix="/api/v1/membership-plans", tags=["membership-plans"])


@router.get("", response_model=list[MembershipPlanRead])
async def list_membership_plans(db: AsyncSession = Depends(get_db)) -> list[MembershipPlanRead]:
    result = await db.execute(select(MembershipPlan).where(MembershipPlan.is_active.is_(True)))
    plans = result.scalars().all()
    return [MembershipPlanRead.model_validate(plan) for plan in plans]
