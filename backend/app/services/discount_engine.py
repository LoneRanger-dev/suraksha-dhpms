import uuid
from dataclasses import dataclass, field
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import MembershipPlan, QRCard
from app.models.enums import CardStatus

CATEGORY_DISCOUNT_FIELD = {
    "CONSULTATION": "consultation_discount_pct",
    "LAB": "lab_discount_pct",
    "PHARMACY": "pharmacy_discount_pct",
}


@dataclass
class LineItemInput:
    description: str
    category: str
    unit_price: Decimal


@dataclass
class LineItemBreakdown:
    description: str
    category: str
    unit_price: Decimal
    discount_pct: Decimal
    final_price: Decimal


@dataclass
class InvoiceSummary:
    gross_amount: Decimal
    discount_amount: Decimal
    net_amount: Decimal
    items: list[LineItemBreakdown] = field(default_factory=list)


def _round2(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


async def _get_active_plan(db: AsyncSession, patient_id: uuid.UUID) -> MembershipPlan | None:
    result = await db.execute(
        select(QRCard)
        .where(QRCard.patient_id == patient_id, QRCard.status == CardStatus.ACTIVE)
        .order_by(QRCard.issued_date.desc())
    )
    card = result.scalars().first()
    if card is None:
        return None
    return await db.get(MembershipPlan, card.plan_id)


async def calculate_invoice_breakdown(
    db: AsyncSession, patient_id: uuid.UUID, line_items: list[LineItemInput]
) -> InvoiceSummary:
    """Applies the patient's active membership tier discount per cost center
    (Consultation / Lab / Pharmacy) and computes gross, discount, and net totals."""
    plan = await _get_active_plan(db, patient_id)

    items: list[LineItemBreakdown] = []
    gross = Decimal("0.00")
    net = Decimal("0.00")

    for line in line_items:
        discount_pct = Decimal("0.00")
        if plan is not None:
            field_name = CATEGORY_DISCOUNT_FIELD.get(line.category)
            if field_name is not None:
                discount_pct = getattr(plan, field_name)

        final_price = _round2(line.unit_price * (Decimal("100") - discount_pct) / Decimal("100"))
        items.append(
            LineItemBreakdown(
                description=line.description,
                category=line.category,
                unit_price=line.unit_price,
                discount_pct=discount_pct,
                final_price=final_price,
            )
        )
        gross += line.unit_price
        net += final_price

    gross = _round2(gross)
    net = _round2(net)
    discount = _round2(gross - net)

    return InvoiceSummary(gross_amount=gross, discount_amount=discount, net_amount=net, items=items)
