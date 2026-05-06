# NCCC Employee Portal Manual QA Checklist

## Standalone Auth

- Confirm the frontend loads without TalyerOS routing, login, or workflow redirects.
- Confirm `GET /api/employee-portal/health` returns ready status.
- Confirm standalone login succeeds with a valid seeded `PortalUser`.
- Confirm invalid login returns a safe standalone error message.
- Confirm logout clears the session and routes the user back to the standalone login screen.
- Confirm session expiry shows a sign-in-again message instead of failing silently.

## RBAC

- Confirm module navigation hides or disables routes the current user should not access.
- Confirm admin-only role and permission controls stay disabled or hidden for non-admin users.
- Confirm backend write routes still reject unauthorized requests even if the frontend is bypassed.

## Employee Setup

- Create and update an employee record.
- Create and update a department record.
- Create and update a position record.
- Create and update a role record.
- Confirm duplicate-submit guards prevent repeated form writes while a request is pending.

## Onboarding

- Create and update an onboarding template.
- Assign onboarding to an employee.
- Update onboarding step progress.
- Approve a checklist through the placeholder approval flow.

## Training

- Create and update a training module.
- Assign training to an employee.
- Update training progress and completion state.
- Confirm certification-ready fields persist without issuing a real certificate file.

## SOP / Document Library

- Create and update an SOP document.
- Archive an SOP document.
- Record an SOP acknowledgement.
- Confirm SOP file references remain URL/reference-only and do not attempt real uploads.

## Timekeeping and Timesheets

- Create an attendance record.
- Request a timekeeping correction.
- Create a timesheet and update timesheet status.
- Confirm correction and approval state persists after refresh.

## Scheduling, PTO, and Swaps

- Create and update a schedule template.
- Publish a schedule instance.
- Create a PTO request.
- Approve and reject PTO requests.
- Create a temporary schedule swap.
- Accept, approve, reject, and cancel swaps without permanently changing schedule templates.
- Confirm stale-record conflicts surface clearly instead of silently overwriting changes.

## Payroll Profiles and Formula Preview

- Create and update a payroll profile.
- Create and update a payroll period.
- Create and update a payroll component.
- Create and update a payroll formula.
- Confirm formula preview remains safe and does not use `eval()` or `Function`.
- Confirm invalid formulas show clear validation errors.
- Confirm payroll stays preview/preparation only and does not finalize or post payroll.

## Benefits and Government Contributions

- Create and update a benefit rule.
- Create and update a government contribution setting with configurable values only.
- Confirm the UI warns that statutory rates are not hardcoded.
- Confirm no official PH statutory rates are embedded in defaults.

## Tool Deposits and Canteen Debt

- Create and update a tool deposit.
- Mark a deposit as refunded and forfeited.
- Create and update a canteen transaction.
- Record a canteen payment or deduction-ready state.
- Confirm balances update without final payroll deduction posting.

## Equipment and Inventory

- Create and update an equipment record with reference-only photo fields.
- Assign and return an equipment item.
- Confirm assignment proof photo references persist.
- Create and update an inventory item.
- Create an inventory movement.
- Confirm inventory low-stock state updates correctly after movements.

## Discipline / Write-Ups

- Create and update a discipline category.
- Create a discipline record.
- Transition a record through draft, issued, acknowledged, and HR-reviewed states.
- Confirm attachment references persist and appear in the record view.

## Monthly Reviews

- Create and update a performance review template.
- Create a performance review.
- Update item scores.
- Submit, acknowledge, and HR-approve a review.
- Confirm weighted score displays remain stable after refresh.

## Audit Logs

- Filter audit logs by module, action, employee/entity id, actor, and date.
- Confirm write actions create database-backed audit entries.
- Confirm attachment metadata changes create `attachment.created`, `attachment.updated`, and `attachment.archived` audit entries.

## Attachment Metadata

- Confirm attachment metadata records can be listed through the API.
- Confirm metadata records contain module, entity type, entity id, reference key, URL/reference, status, and upload attribution fields.
- Confirm metadata sync works for SOP documents, equipment photo references, assignment proof photos, discipline attachments, and inventory reference photos.
- Confirm attachment metadata uses URL/reference fields only and does not require object storage.

## Mobile Layout

- Confirm login, navigation, dashboard cards, forms, tables, and approval flows remain usable on narrow widths.
- Confirm horizontally dense tables scroll cleanly instead of clipping content.
- Confirm action buttons remain reachable in timekeeping, review, leave, and equipment return flows.

## Deployment Environment

- Run `npm run build`.
- Run `npx prisma validate`.
- Start the backend with `npm run api:start`.
- Confirm no TalyerOS auth or workflow integration is activated.
- Confirm no hardcoded PH statutory rates appear in configurable contribution or formula flows.
- Confirm `.env.example` documents required variables and no real `.env` values are committed.
