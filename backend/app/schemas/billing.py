import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.models.enums import InvoiceStatus


class InvoiceLineItemInput(BaseModel):
    description: str
    category: str
    unit_price: Decimal


class InvoiceCreate(BaseModel):
    patient_id: uuid.UUID
    visit_id: uuid.UUID | None = None
    items: list[InvoiceLineItemInput]


class InvoiceItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    invoice_item_id: uuid.UUID
    description: str
    category: str
    unit_price: Decimal
    discount_pct: Decimal
    final_price: Decimal


class InvoiceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    invoice_id: uuid.UUID
    patient_id: uuid.UUID
    gross_amount: Decimal
    discount_amount: Decimal
    net_amount: Decimal
    status: InvoiceStatus
    items: list[InvoiceItemRead]


class InvoiceListItem(BaseModel):
    invoice_id: uuid.UUID
    patient_id: uuid.UUID
    patient_display_id: str
    patient_full_name: str
    gross_amount: Decimal
    discount_amount: Decimal
    net_amount: Decimal
    status: InvoiceStatus
    created_at: datetime


class BillingSummaryRead(BaseModel):
    invoice_count: int
    total_gross: Decimal
    total_discount: Decimal
    total_net: Decimal
