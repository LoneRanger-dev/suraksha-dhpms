import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import Notification, User
from app.models.enums import UserRole
from app.schemas.notification import NotificationAdminRead, NotificationRead

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])

NOTIFICATION_ADMIN_ROLES = {UserRole.SUPER_ADMIN, UserRole.ADMIN}


@router.get("", response_model=list[NotificationAdminRead])
async def list_all_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[NotificationAdminRead]:
    if current_user.role not in NOTIFICATION_ADMIN_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not permitted to view all notifications")

    result = await db.execute(
        select(Notification).options(selectinload(Notification.user)).order_by(Notification.created_at.desc()).limit(200)
    )
    return [
        NotificationAdminRead(
            notification_id=n.notification_id,
            recipient_phone=n.user.phone,
            recipient_role=n.user.role.value,
            title=n.title,
            message=n.message,
            is_read=n.is_read,
            created_at=n.created_at,
        )
        for n in result.scalars().all()
    ]


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
