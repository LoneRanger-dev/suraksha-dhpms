import uuid

from pydantic import BaseModel


class LoginRequest(BaseModel):
    phone: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str


class CurrentUserRead(BaseModel):
    user_id: uuid.UUID
    phone: str
    role: str
    doctor_id: uuid.UUID | None = None
    doctor_full_name: str | None = None
