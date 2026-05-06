# NCCC Employee Portal Deployment Guide

## Standalone Deployment Scope

The NCCC Employee Portal deploys as its own standalone frontend and backend application. It does not use TalyerOS authentication, routing, login, or workflow integration.

## Required Environment Variables

- `DATABASE_URL`: PostgreSQL connection string for the standalone Employee Portal database.
- `JWT_SECRET`: long random secret used for standalone portal JWT signing.
- `PORT`: backend API port. Local default is `4100`.
- `CORS_ORIGIN`: allowed frontend origin for API requests, for example `http://127.0.0.1:5173`.
- `VITE_API_BASE_URL`: frontend API base path or full URL. Local default is `/api/employee-portal`.
- `ADMIN_EMAIL`: optional bootstrap admin email for seed runs.
- `ADMIN_PASSWORD`: optional bootstrap admin password for seed runs. Never commit a real value.
- `ADMIN_ROLE`: optional bootstrap admin role. Default is `ADMIN`.

## Local Startup

1. Copy `.env.example` to `.env` and fill in real values.
2. Install dependencies with `npm install`.
3. Validate the Prisma schema with `npx prisma validate`.
4. Review migration changes before applying them. No destructive migration steps should be run without explicit review.
5. Generate the Prisma client with `npx prisma generate`.
6. Optionally seed baseline data with `npm run db:seed`.
7. Start the backend with `npm run api:dev`.
8. Start the frontend with `npm run dev`.

## Safe Migration Workflow

1. Review the current `prisma/schema.prisma`.
2. Prepare an additive migration only.
3. Run Prisma migration commands in a non-production environment first.
4. Back up the target database before production apply.
5. Re-run `npx prisma validate` and `npm run build` after the migration is prepared.

## Build and Runtime Notes

- `npm run build` builds the frontend and typechecks the backend code.
- `npm run api:start` starts the Express API through `tsx`.
- Vite dev proxy forwards `/api/*` requests to `http://127.0.0.1:$PORT`.
- Health endpoints:
  - `GET /api/employee-portal`
  - `GET /api/employee-portal/health`

## Production Checklist

- Confirm `JWT_SECRET` is rotated to a real secret.
- Confirm `CORS_ORIGIN` matches the deployed frontend host.
- Confirm `DATABASE_URL` points to the standalone portal database.
- Seed only through env-driven bootstrap values.
- Verify standalone auth works without any TalyerOS dependency.
- Verify payroll remains preview and preparation only.
