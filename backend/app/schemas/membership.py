import uuid
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import MembershipTier


class MembershipPlanCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    tier: MembershipTier
    price: Decimal = Decimal("0.00")
    validity_days: int = Field(default=365, gt=0)
    consultation_discount_pct: Decimal = Field(default=Decimal("0.00"), ge=0, le=100)
    lab_discount_pct: Decimal = Field(default=Decimal("0.00"), ge=0, le=100)
    pharmacy_discount_pct: Decimal = Field(default=Decimal("0.00"), ge=0, le=100)


class MembershipPlanAdminRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    plan_id: uuid.UUID
    name: str
    tier: MembershipTier
    price: Decimal
    validity_days: int
    consultation_discount_pct: Decimal
    lab_discount_pct: Decimal
    pharmacy_discount_pct: Decimal
    is_active: bool
