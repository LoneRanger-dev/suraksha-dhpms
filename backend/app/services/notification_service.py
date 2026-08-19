import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Notification


async def notify(db: AsyncSession, user_id: uuid.UUID | None, title: str, message: str) -> None:
    """Creates an in-app notification. No-op if the recipient has no login
    account (e.g. a family member profile without a linked User)."""
    if user_id is None:
        return
    db.add(Notification(user_id=user_id, title=title, message=message))
