from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import (
    appointments,
    auth,
    billing,
    consultations,
    departments,
    doctors,
    memberships,
    patients,
    qrcards,
    scan,
)
from app.core.config import settings

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(patients.router)
app.include_router(qrcards.router)
app.include_router(memberships.router)
app.include_router(auth.router)
app.include_router(scan.router)
app.include_router(appointments.router)
app.include_router(consultations.router)
app.include_router(billing.router)
app.include_router(doctors.router)
app.include_router(departments.router)


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name}
