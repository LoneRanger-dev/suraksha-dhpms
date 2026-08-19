import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import Notification, User
from app.schemas.notification import NotificationRead

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])


@router.get("/me", response_model=list[NotificationRead])
async def list_my_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[NotificationRead]:
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == current_user.user_id)
        .order_by(Notification.created_at.desc())
    )
    return [NotificationRead.model_validate(n) for n in result.scalars().all()]


@router.post("/{notification_id}/read", response_model=NotificationRead)
async def mark_notification_read(
    notification_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NotificationRead:
    notification = await db.get(Notification, notification_id)
    if notification is None or notification.user_id != current_user.user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    notification.is_read = True
    await db.commit()
    await db.refresh(notification)
    return NotificationRead.model_validate(notification)
