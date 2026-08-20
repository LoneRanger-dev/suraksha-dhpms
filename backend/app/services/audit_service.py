import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AuditLog


async def record_audit(
    db: AsyncSession,
    *,
    performed_by: uuid.UUID | None,
    action: str,
    entity_affected: str,
    entity_id: uuid.UUID,
    ip_address: str | None = None,
) -> AuditLog:
    log = AuditLog(
        performed_by=performed_by,
        action=action,
        entity_affected=entity_affected,
        entity_id=entity_id,
        ip_address=ip_address,
    )
    db.add(log)
    await db.commit()
    return log
