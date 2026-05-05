# EstateFlow

Monorepo structure:

- `backend/`: Laravel 12 API with Sanctum session-based authentication.
- `frontend/`: React + Vite client.
- `PROJECT_ANALYSIS.md`: review of the original database and how it was extended.

## Setup

Backend:

1. `cd backend`
2. Copy `.env.example` to `.env` if needed.
3. Set database credentials.
4. Run `composer install`
5. Run `php artisan key:generate`
6. Run `php artisan migrate:fresh --seed`
7. Run `php artisan serve`

Frontend:

1. `cd frontend`
2. Run `npm install`
3. Run `npm run dev`

Default API base URL expected by the frontend:

- `http://127.0.0.1:8000/api`

Override it with `VITE_API_BASE_URL` if needed.

## Seeded accounts

- Admin: `admin@estateflow.test` / `password123`
- Agent: `mia.agent@estateflow.test` / `password123`
- Agent: `luis.agent@estateflow.test` / `password123`
- User: `ava.user@estateflow.test` / `password123`
- User: `noah.user@estateflow.test` / `password123`

## Core features

- Public property browsing with filters.
- Role-based authentication.
- Buyer saved listings (with pagination) and email-based inquiry submission.
- Restricted agent reviews (verified interaction required).
- Saved searches with automated daily email alerts for new matching properties.
- Agent listing management.
- Admin user, agent, and property oversight.
- Email notifications for status updates, inquiries, and saved search alerts.

## Verified locally

- `php artisan migrate:fresh --seed`
- `php artisan route:list --path=api`
- `php artisan test`
- `npm run build`
