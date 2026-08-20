import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AuditLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    log_id: uuid.UUID
    performed_by: uuid.UUID | None
    action: str
    entity_affected: str
    entity_id: uuid.UUID
    ip_address: str | None
    timestamp: datetime
