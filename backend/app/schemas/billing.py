import uuid
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
