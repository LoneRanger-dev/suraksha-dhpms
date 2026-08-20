from datetime import date

from redis.exceptions import RedisError
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis_client import get_redis_client
from app.models import Appointment, Department, Doctor

QUEUE_COUNTER_TTL_SECONDS = 60 * 60 * 24 * 2


async def _count_existing_appointments(db: AsyncSession, department_id, target_date: date) -> int:
    result = await db.execute(
        select(func.count())
        .select_from(Appointment)
        .join(Doctor, Appointment.doctor_id == Doctor.doctor_id)
        .where(Doctor.department_id == department_id, Appointment.appointment_date == target_date)
    )
    return result.scalar_one()


async def generate_queue_token(db: AsyncSession, department: Department, on_date: date | None = None) -> str:
    """Issues an OPD queue token like CARDIO-001, sequential per department per day.

    Uses a Redis INCR as the atomic counter so two concurrent bookings can
    never be handed the same token - a plain DB COUNT is subject to a race
    where both requests read the same count before either commits. The
    counter cold-starts from the current DB count on its first use each day
    (SET NX), so it stays correct for appointments recorded before this
    counter existed. Falls back to the old DB-count approach if Redis is
    unavailable, so a cache outage never blocks booking.
    """
    target_date = on_date or date.today()
    code = department.name[:6].upper().replace(" ", "")
    key = f"queue:{department.department_id}:{target_date.isoformat()}"

    try:
        redis_client = get_redis_client()
        existing_count = await _count_existing_appointments(db, department.department_id, target_date)
        await redis_client.set(key, existing_count, nx=True, ex=QUEUE_COUNTER_TTL_SECONDS)
        next_number = await redis_client.incr(key)
    except RedisError:
        next_number = await _count_existing_appointments(db, department.department_id, target_date) + 1

    return f"{code}-{next_number:03d}"
