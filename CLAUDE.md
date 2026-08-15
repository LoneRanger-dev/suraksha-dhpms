# Suraksha DHPMS — Global Engineering Rules

Digital Hospital Patient Management System (DHPMS) — enterprise healthcare SaaS.
These rules are binding for every contributor (human or AI) working in this repository.

## 1. TDD Mandate

Strict adherence to Test-Driven Development is required for all application code.

- Always write a **failing test first** (pytest for `backend/`, Vitest for `frontend/`) before implementing the corresponding logic.
- A feature or fix is not "done" until: a test existed that failed for the right reason, the implementation was written to make it pass, and the suite is green.
- No implementation commits without an accompanying test that would have caught the bug/regression.
- Backend: `pytest` (+ `pytest-asyncio` for async SQLAlchemy/FastAPI code).
- Frontend: `vitest` (+ `@testing-library/react` for component behavior).

## 2. UI/UX Rules

- Invoke the `Frontend design` skill for all UI tasks (new pages, components, layout, or visual changes).
- Enforce high-contrast, clinical layouts. Zero cognitive fatigue — critical parameters (allergies, blood group, age) must be prominently anchored, never buried.
- Color system (fixed — do not substitute):
  - **Deep Cyan** `#0284C7` — primary brand / interactive elements
  - **Medical Slate** `#0F172A` — primary text / dark surfaces
  - **Emerald Green** `#10B981` — verified / active membership states
  - **Vivid Red** `#EF4444` — critical alerts / allergies / errors
  - **Amber** `#F59E0B` — pending / triage warning states
- All color tokens must be defined once (CSS variables / Tailwind theme) and consumed everywhere — no hard-coded hex values scattered across components.

## 3. Architecture

- **Backend (`backend/`):** FastAPI, structured with Domain-Driven Design. Routers stay thin (`app/api/v1/`); business rules live in `app/services/`; persistence in `app/models/` (SQLAlchemy 2.0 async ORM) with `app/schemas/` (Pydantic v2) as the API boundary. No business logic in route handlers.
- **Frontend (`frontend/`):** Next.js 15, App Router only (no Pages Router). Route groups separate portals: `(auth)`, `(patient)`, `(staff)`. Server Components by default; Client Components only where interactivity requires it (scanner, forms).
- **Database:** PostgreSQL 16 as system of record. Redis 7 for session/queue/cache state. All schema changes go through Alembic migrations — never hand-edit the database.
