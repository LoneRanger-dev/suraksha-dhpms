"""Seed demo staff accounts (receptionist + doctor) for client demos.

Idempotent: safe to run multiple times, skips rows that already exist.
Usage: python -m scripts.seed_demo_staff
"""

import asyncio

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models import Department, Doctor, User
from app.models.enums import UserRole

DEMO_RECEPTIONIST_PHONE = "+919876543210"
DEMO_DOCTOR_PHONE = "+919876543211"
DEMO_PASSWORD = "Demo@1234"
DEMO_DEPARTMENT_NAME = "General Medicine"
DEMO_DOCTOR_NAME = "Dr. Anjali Rao"


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        department = (
            await db.execute(select(Department).where(Department.name == DEMO_DEPARTMENT_NAME))
        ).scalar_one_or_none()
        if department is None:
            department = Department(name=DEMO_DEPARTMENT_NAME, description="General outpatient consultations")
            db.add(department)
            await db.flush()
            print(f"Created department: {department.name}")
        else:
            print(f"Department already exists: {department.name}")

        receptionist = (
            await db.execute(select(User).where(User.phone == DEMO_RECEPTIONIST_PHONE))
        ).scalar_one_or_none()
        if receptionist is None:
            receptionist = User(
                phone=DEMO_RECEPTIONIST_PHONE,
                email="reception.demo@suraksha-dhpms.test",
                password_hash=hash_password(DEMO_PASSWORD),
                role=UserRole.RECEPTIONIST,
            )
            db.add(receptionist)
            print(f"Created receptionist user: {DEMO_RECEPTIONIST_PHONE}")
        else:
            print(f"Receptionist already exists: {DEMO_RECEPTIONIST_PHONE}")

        doctor_user = (
            await db.execute(select(User).where(User.phone == DEMO_DOCTOR_PHONE))
        ).scalar_one_or_none()
        if doctor_user is None:
            doctor_user = User(
                phone=DEMO_DOCTOR_PHONE,
                email="doctor.demo@suraksha-dhpms.test",
                password_hash=hash_password(DEMO_PASSWORD),
                role=UserRole.DOCTOR,
            )
            db.add(doctor_user)
            await db.flush()
            print(f"Created doctor user: {DEMO_DOCTOR_PHONE}")
        else:
            print(f"Doctor user already exists: {DEMO_DOCTOR_PHONE}")

        existing_doctor_profile = (
            await db.execute(select(Doctor).where(Doctor.user_id == doctor_user.user_id))
        ).scalar_one_or_none()
        if existing_doctor_profile is None:
            doctor_profile = Doctor(
                user_id=doctor_user.user_id,
                department_id=department.department_id,
                full_name=DEMO_DOCTOR_NAME,
                qualification="MBBS, MD (General Medicine)",
                specialization="General Physician",
                consultation_fee=500,
            )
            db.add(doctor_profile)
            print(f"Created doctor profile: {DEMO_DOCTOR_NAME}")
        else:
            print(f"Doctor profile already exists: {DEMO_DOCTOR_NAME}")

        await db.commit()

    print("\nDemo credentials:")
    print(f"  Receptionist  phone={DEMO_RECEPTIONIST_PHONE}  password={DEMO_PASSWORD}")
    print(f"  Doctor        phone={DEMO_DOCTOR_PHONE}  password={DEMO_PASSWORD}")


if __name__ == "__main__":
    asyncio.run(seed())
