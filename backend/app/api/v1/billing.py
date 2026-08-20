import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import Invoice, InvoiceItem, Patient, User
from app.models.enums import UserRole
from app.schemas.billing import BillingSummaryRead, InvoiceCreate, InvoiceListItem, InvoiceRead
from app.services.discount_engine import LineItemInput, calculate_invoice_breakdown

router = APIRouter(prefix="/api/v1/billing", tags=["billing"])

BILLING_ROLES = {UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.RECEPTIONIST}
REPORTS_ROLES = {UserRole.SUPER_ADMIN, UserRole.ADMIN}


@router.post("/invoices", response_model=InvoiceRead, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    payload: InvoiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InvoiceRead:
    if current_user.role not in BILLING_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not permitted to create invoices")

    patient = await db.get(Patient, payload.patient_id)
    if patient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    line_items = [
        LineItemInput(description=item.description, category=item.category, unit_price=item.unit_price)
        for item in payload.items
    ]
    summary = await calculate_invoice_breakdown(db, patient.patient_id, line_items)

    invoice = Invoice(
        patient_id=patient.patient_id,
        visit_id=payload.visit_id,
        gross_amount=summary.gross_amount,
        discount_amount=summary.discount_amount,
        net_amount=summary.net_amount,
    )
    for breakdown in summary.items:
        invoice.items.append(
            InvoiceItem(
                description=breakdown.description,
                category=breakdown.category,
                unit_price=breakdown.unit_price,
                discount_pct=breakdown.discount_pct,
                final_price=breakdown.final_price,
            )
        )
    db.add(invoice)
    await db.commit()
    return InvoiceRead.model_validate(invoice)


@router.get("/invoices", response_model=list[InvoiceListItem])
async def list_invoices(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[InvoiceListItem]:
    if current_user.role not in BILLING_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not permitted to view invoices")

    result = await db.execute(
        select(Invoice).options(selectinload(Invoice.patient)).order_by(Invoice.created_at.desc())
    )
    invoices = result.scalars().all()

    return [
        InvoiceListItem(
            invoice_id=inv.invoice_id,
            patient_id=inv.patient_id,
            patient_display_id=inv.patient.patient_display_id,
            patient_full_name=inv.patient.full_name,
            gross_amount=inv.gross_amount,
            discount_amount=inv.discount_amount,
            net_amount=inv.net_amount,
            status=inv.status,
            created_at=inv.created_at,
        )
        for inv in invoices
    ]


@router.get("/summary", response_model=BillingSummaryRead)
async def get_billing_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BillingSummaryRead:
    if current_user.role not in REPORTS_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not permitted to view billing reports")

    result = await db.execute(
        select(
            func.count(Invoice.invoice_id),
            func.coalesce(func.sum(Invoice.gross_amount), 0),
            func.coalesce(func.sum(Invoice.discount_amount), 0),
            func.coalesce(func.sum(Invoice.net_amount), 0),
        )
    )
    count, gross, discount, net = result.one()

    return BillingSummaryRead(
        invoice_count=count,
        total_gross=Decimal(gross),
        total_discount=Decimal(discount),
        total_net=Decimal(net),
    )


@router.get("/invoices/{invoice_id}", response_model=InvoiceRead)
async def get_invoice(
    invoice_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InvoiceRead:
    invoice = await db.get(Invoice, invoice_id)
    if invoice is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    return InvoiceRead.model_validate(invoice)
