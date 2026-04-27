# Repository Guidelines

## Project Structure & Module Organization
This is a monorepo with two primary apps:
- `backend/` contains the Laravel 12 API, including `app/`, `routes/`, `database/`, and `tests/`.
- `frontend/` contains the React + Vite client in `src/`, organized by `components/`, `pages/`, `context/`, and `api/`.
- `real_estate.sql` and `real_estate_schema_reference.docx` document the database shape and seed data.

## Build, Test, and Development Commands
Run commands from the relevant subdirectory.
- `cd backend && composer install` installs PHP dependencies.
- `cd backend && composer dev` starts the Laravel server, queue listener, logs, and Vite together.
- `cd backend && php artisan test` runs PHPUnit feature and unit tests.
- `cd backend && php artisan migrate:fresh --seed` resets the database and loads sample data.
- `cd frontend && npm install` installs frontend dependencies.
- `cd frontend && npm run dev` starts the Vite dev server.
- `cd frontend && npm run build` produces the production bundle.
- `cd frontend && npm run lint` checks JavaScript and JSX with ESLint.

## Coding Style & Naming Conventions
Use the existing style in each package:
- PHP follows Laravel conventions and PSR-12; use `laravel/pint` if you need to normalize formatting.
- JavaScript and JSX use ES modules, 2-space indentation, and semicolon-terminated statements.
- Name backend controllers, models, and tests with clear Laravel conventions, such as `PortalController`, `Property.php`, and `AgentPropertyImageUploadTest.php`.
- Name React pages and components in `PascalCase`, for example `DashboardPage.jsx` and `PropertyCard.jsx`.

## Testing Guidelines
Backend tests live in `backend/tests/` and use PHPUnit. Keep fast checks in `Unit/` and HTTP or workflow coverage in `Feature/`. Prefer descriptive test names ending in `Test.php`, and use the in-memory SQLite test setup defined in `phpunit.xml`.

## Commit & Pull Request Guidelines
Recent history uses short conventional commits like `feat: ...` and `fix: ...`. Keep commit subjects imperative, scoped, and specific. For pull requests, include:
- a short summary of the change
- any migration or seed steps required
- screenshots or screen recordings for UI changes
- links to related issues when applicable

## Security & Configuration Tips
Do not commit `.env` files or other secrets. The frontend expects `VITE_API_BASE_URL` to point at the Laravel API, typically `http://127.0.0.1:8000/api`.
