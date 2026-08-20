import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NotificationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    notification_id: uuid.UUID
    title: str
    message: str
    is_read: bool
    created_at: datetime


class NotificationAdminRead(BaseModel):
    notification_id: uuid.UUID
    recipient_phone: str
    recipient_role: str
    title: str
    message: str
    is_read: bool
    created_at: datetime
