import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import AuditLog, User
from app.models.enums import UserRole
from app.schemas.audit import AuditLogRead

router = APIRouter(prefix="/api/v1/audit-logs", tags=["audit"])

AUDIT_VIEW_ROLES = {UserRole.SUPER_ADMIN}


@router.get("", response_model=list[AuditLogRead])
async def list_audit_logs(
    entity_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AuditLogRead]:
    if current_user.role not in AUDIT_VIEW_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not permitted to view audit logs")

    query = select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(200)
    if entity_id is not None:
        query = query.where(AuditLog.entity_id == entity_id)

    result = await db.execute(query)
    return [AuditLogRead.model_validate(log) for log in result.scalars().all()]
