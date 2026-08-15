import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.security import create_access_token, verify_password
from app.models import Doctor, User
from app.schemas.auth import CurrentUserRead, LoginRequest, TokenResponse

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    result = await db.execute(select(User).where(User.phone == payload.phone))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid phone or password")

    token = create_access_token(subject=str(user.user_id), role=user.role.value)
    return TokenResponse(access_token=token, role=user.role.value)


@router.get("/me", response_model=CurrentUserRead)
async def read_current_user(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CurrentUserRead:
    doctor_id: uuid.UUID | None = None
    doctor_full_name: str | None = None
    if current_user.role.value == "DOCTOR":
        result = await db.execute(select(Doctor).where(Doctor.user_id == current_user.user_id))
        doctor = result.scalar_one_or_none()
        if doctor is not None:
            doctor_id = doctor.doctor_id
            doctor_full_name = doctor.full_name

    return CurrentUserRead(
        user_id=current_user.user_id,
        phone=current_user.phone,
        role=current_user.role.value,
        doctor_id=doctor_id,
        doctor_full_name=doctor_full_name,
    )
