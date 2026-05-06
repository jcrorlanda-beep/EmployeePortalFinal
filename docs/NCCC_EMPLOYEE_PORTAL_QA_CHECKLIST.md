# NCCC Employee Portal Manual QA Checklist

## Access and Auth

- Confirm the frontend loads without TalyerOS routing or login.
- Confirm `GET /api/employee-portal/health` returns ready status.
- Confirm standalone login succeeds with a valid seeded `PortalUser`.
- Confirm invalid login returns a safe error message.
- Confirm `GET /api/employee-portal/auth/me` returns the current standalone portal user with a valid token.

## Core Records

- Create and update an employee record.
- Create and update a department record.
- Create and update a position record.
- Create and update a role record.

## Onboarding, Training, SOP

- Create and update an onboarding template.
- Assign onboarding to an employee and approve a checklist.
- Create and update a training module.
- Assign training to an employee and update completion status.
- Create and update an SOP document.
- Record an SOP acknowledgement.

## Time, Scheduling, Leave

- Create an attendance record.
- Request a timekeeping correction.
- Create a timesheet and update timesheet status.
- Create and update a schedule template.
- Publish a schedule instance.
- Create and update a PTO request.
- Create and update a temporary schedule swap.

## Payroll and Formula Safety

- Create and update a payroll profile.
- Create and update a payroll period.
- Create and update a payroll formula.
- Confirm formula preview remains safe and does not use `eval()` or `Function`.
- Confirm payslip records remain preview-only.

## Benefits, Deposits, Assets

- Create and update a benefit rule.
- Create and update a government contribution setting with configurable values only.
- Create and update a tool deposit.
- Create and update a canteen transaction.
- Create and update an equipment record with reference-only photo fields.
- Create and update an equipment assignment.
- Create and update an inventory item.
- Create an inventory movement.

## Discipline, Reviews, Audit

- Create and update a discipline category.
- Create and update a discipline record.
- Create and update a performance review template.
- Create and update a performance review.
- Filter audit logs by module, action, employee/entity id, and date.
- Confirm write actions create database-backed audit entries.

## Release Checks

- Run `npm run build`.
- Run `npx prisma validate`.
- Start the backend with `npm run api:start`.
- Confirm no TalyerOS auth or workflow integration is activated.
- Confirm no hardcoded PH statutory rates appear in configurable contribution or formula flows.
