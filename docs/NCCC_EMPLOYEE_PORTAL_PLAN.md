# NCCC Employee Portal MVP Plan

## Scope

The NCCC Employee Portal is a standalone HR and workforce management MVP for Northeast Car Care Centre. It is intentionally separate from TalyerOS. No TalyerOS authentication, login, routing, or landing-page integration is activated in this MVP.

## Architecture

- Frontend: React, TypeScript, and Vite.
- Backend-ready: Node/Express placeholder service in `server/index.ts`.
- Database-ready: PostgreSQL with Prisma schema in `prisma/schema.prisma`.
- Runtime data: mock-safe service arrays with async APIs; no localStorage-first architecture.
- Payroll: formula-ready, preview-only, and not finalization-capable.
- Audit logs: edit services accept audit metadata or expose audit-ready records for future persistence.

## Phase Completion Summary

| Phase | Module | MVP Status |
| --- | --- | --- |
| 001 | Foundation, split files, pages, services, types, docs, Prisma-ready schema | Complete |
| 002 | Employee CRUD | Complete with mock-safe create/list/update service and UI create action |
| 003 | Departments / positions / roles | Complete with setup services and UI create actions |
| 004 | Onboarding checklist | Complete foundation |
| 005 | Training hub | Complete foundation |
| 006 | SOP document library | Complete foundation |
| 007 | Timekeeping | Complete foundation |
| 008 | Timesheets | Complete review foundation |
| 009 | Scheduling | Complete foundation |
| 010 | PTO / leave requests | Complete foundation |
| 011 | Temporary schedule swaps | Complete foundation |
| 012 | Payroll profiles | Complete preview setup |
| 013 | Formula engine | Complete safe placeholder foundation |
| 014 | Benefits | Complete formula-linked setup |
| 015 | PH government contributions | Complete configurable setup, no hardcoded statutory rates |
| 016 | Payslips | Complete preview-only foundation |
| 017 | Tool deposits | Complete formula-linked foundation |
| 018 | Tools & equipment registry | Complete with photo reference fields |
| 019 | Inventory | Complete with movement logs |
| 020 | Equipment assignment and deposit link | Complete foundation |
| 021 | Write-ups / warnings | Complete with editable category foundation |
| 022 | Canteen debt / paycut | Complete formula-linked ledger foundation |
| 023 | Monthly performance reviews | Complete editable template foundation |
| 024 | Internal communication | Complete placeholder foundation |
| 025 | Admin dashboard | Complete |
| 026 | Central audit logs | Complete foundation |
| 027 | MVP QA and stabilization | Complete after successful build |

## Safety Decisions

1. No hardcoded Philippine statutory payroll contribution rates are included.
2. Payroll, deductions, benefits, allowances, overtime, holiday pay, government contributions, tool deposits, canteen deductions, and 13th month pay are represented by configurable formula codes.
3. Payslips are preview-only and cannot be finalized.
4. Prisma schema is prepared only; no destructive migrations were generated or run.
5. The portal is mounted directly as the app root for MVP preview, not as a TalyerOS route or login entry.

## Autocheck Result

- Required split-file folder structure exists.
- Required module pages compile through `employeePortalRoutes.tsx`.
- Services are mock-safe and database-ready.
- Database schema contains all requested model names.
- TalyerOS integration remains inactive.
- Build command: `npm run build`.
