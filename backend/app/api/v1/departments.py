from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import Department, User
from app.models.enums import UserRole
from app.schemas.department import DepartmentCreate, DepartmentRead

router = APIRouter(prefix="/api/v1/departments", tags=["departments"])

ADMIN_ROLES = {UserRole.SUPER_ADMIN, UserRole.ADMIN}


@router.get("", response_model=list[DepartmentRead])
async def list_departments(db: AsyncSession = Depends(get_db)) -> list[DepartmentRead]:
    result = await db.execute(select(Department).order_by(Department.name))
    return [DepartmentRead.model_validate(dept) for dept in result.scalars().all()]


@router.post("", response_model=DepartmentRead, status_code=status.HTTP_201_CREATED)
async def create_department(
    payload: DepartmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DepartmentRead:
    if current_user.role not in ADMIN_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not permitted to manage departments")

    department = Department(name=payload.name, description=payload.description)
    db.add(department)
    await db.commit()
    await db.refresh(department)
    return DepartmentRead.model_validate(department)
