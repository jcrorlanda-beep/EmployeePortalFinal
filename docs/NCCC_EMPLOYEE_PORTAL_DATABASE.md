# NCCC Employee Portal Database Preparation

## Database Strategy

The MVP includes a Prisma-ready PostgreSQL schema in `prisma/schema.prisma`. The schema is safe to review and evolve, but no migrations are executed by the MVP. When `DATABASE_URL` is unavailable, frontend services use mock-safe in-memory arrays and preserve Prisma-compatible field names.

## Prepared Models

The schema prepares the requested workforce models:

- PortalUser
- Employee, Department, Position, EmployeeRole
- OnboardingChecklist, OnboardingStep
- TrainingModule, TrainingAssignment
- AttendanceRecord, TimesheetRecord
- ScheduleTemplate, ScheduleInstance, PtoRequest, PtoBalance, ScheduleSwapRequest
- PayrollProfile, PayrollPeriod, PayrollFormula, PayrollComponent
- BenefitRule, GovernmentContributionSetting
- Payslip, PayslipLineItem
- ToolDeposit, EquipmentItem, EquipmentAssignment
- InventoryItem, InventoryMovement
- DisciplineRecord, DisciplineCategory
- CanteenTransaction, EmployeeDebtLedger
- PerformanceReviewTemplate, PerformanceReview, PerformanceReviewItem
- SopDocument
- AuditLogEntry

## Formula-Ready Payroll Notes

Payroll-related tables store formula codes or formula expressions instead of statutory constants. This prevents accidental hardcoding of salary, benefits, deductions, allowances, overtime, holiday pay, government contributions, tool deposits, canteen deductions, or 13th month pay values.

A future production implementation should add:

1. A reviewed formula evaluator with allowlisted operators and variables.
2. Versioned formula records with approval workflow.
3. Effective-date windows for contribution settings.
4. Immutable payroll run snapshots after legal and accounting review.
5. Full audit-log persistence with before/after payload capture.

## Migration Safety

No destructive migration is required or generated. Before production use, create a non-destructive migration plan with reviewed seed data and environment-specific `DATABASE_URL` configuration.

## Phase 002 Data Layer Notes

Employee, Department, and Position services remain in-memory only for the current MVP session when no live database connection exists. The async service method contracts are intentionally database-ready and now include create/update flows for employee CRUD, department setup, and position setup. No Prisma migrations were created or executed. Audit placeholder events are recorded for `employee.created`, `employee.updated`, `department.created`, `department.updated`, `position.created`, and `position.updated`.

## Phase 003 Data Layer Notes

Department and Position session-state records now include administration fields needed by the MVP UI, including setup codes, active/inactive status, department lead assignment, sort order, and default role assignment. Role records now carry configurable permission group code arrays. These permission groups prepare future authorization design only; they do not enforce auth or login behavior. No Prisma migrations were created or executed during Phase 003. A future additive schema revision should persist department codes, manager employee references, sort order, position codes, position default roles, and permission group metadata after review.

## Phase 004 Data Layer Notes

Onboarding remains session-scoped in the MVP service layer when no live database connection exists. The Phase 004 service contracts are async and database-ready for onboarding templates, template steps, employee onboarding checklists, step progress, and supervisor approval placeholders. Audit placeholder events are recorded for `onboarding.template.created`, `onboarding.template.updated`, `onboarding.assigned`, `onboarding.step.updated`, and `onboarding.approved`. No Prisma migrations were created or executed. A future additive schema revision should persist template status, target role, target department, step metadata, employee checklist assignments, progress notes, completion timestamps, and approval metadata.

## Phase 004 Conflict Recovery Data Notes

- The Phase 004 recovery pass confirmed onboarding data remains session-scoped through async service contracts until a live database connection is introduced.
- Onboarding template, template step, employee checklist, step progress, and approval metadata fields remain Prisma-ready for future additive persistence.
- Existing Phase 001-003 employee, department, position, role, and permission setup assumptions were preserved; no destructive migrations were generated or run.

## Phase 005 Data Layer Notes

- Training remains session-scoped in the MVP service layer when no live database connection exists.
- Training module records now include category, level, optional target role, estimated minutes, content type, content reference, lifecycle status, certification eligibility, and created/updated timestamps.
- Training assignment records now include employee, training module, status, assigned date, optional due date, optional completion date, optional score, supervisor notes, and certification-issued fields.
- Audit placeholder events are recorded for `training.module.created`, `training.module.updated`, `training.assigned`, `training.progress.updated`, `training.completed`, and `training.certification.issued`.
- No quiz attempt tables, video asset tables, upload storage, auth enforcement tables, TalyerOS integration records, or Prisma migrations were added during Phase 005.
- A future additive schema revision should persist training categories, module lifecycle history, assignment progress history, score evidence, certification issue metadata, and document references after review.

## Phase 006 Data Layer Notes

- SOP/document records remain session-scoped in the MVP service layer when no live database connection exists.
- SOP/document records now include document type, version, owner, file reference, acknowledgement-required flag, lifecycle status, effective date, archive timestamp, and created/updated timestamps.
- SOP acknowledgement records are placeholder-ready with document, employee, status, acknowledgement timestamp, and notes fields.
- Audit placeholder events are recorded for `sop.created`, `sop.updated`, `sop.acknowledged`, and `sop.archived`.
- No file storage tables, upload blobs, auth enforcement, electronic signature enforcement, TalyerOS integration records, or Prisma migrations were added during Phase 006.
- A future additive schema revision should persist document revision history, acknowledgement evidence, superseded-version behavior, and immutable archive metadata after review.

## Phase 028-050 Data Layer Notes

- Prisma now includes a standalone `PortalUser` model for NCCC portal auth without any TalyerOS auth coupling.
- Prisma client startup is configured for Prisma 7 with `prisma.config.ts` and the PostgreSQL driver adapter in the backend client.
- Additive schema alignment now covers standalone auth, richer training metadata, SOP acknowledgements, review approval metadata, correction notes, tool deposit details, equipment/photo reference fields, and discipline acknowledgement fields.
- Backend write routes now have database-backed audit logging support through the shared audit middleware and `AuditLogEntry`.
- Seed/bootstrap support is provided through `prisma/seed.ts` with env-driven admin creation and no destructive reset behavior.
- Migration steps are documented only. No destructive Prisma migration was executed as part of this implementation.

## Phase 052 Data Layer Notes

- Onboarding persistence now uses backend-backed `OnboardingChecklist` plus `OnboardingStep` records for template storage, with employee checklist assignments and step-progress payloads flowing through the standalone API.
- Training persistence now uses backend-backed `TrainingModule` and `TrainingAssignment` records with assignment dates, due dates, supervisor notes, completion metadata, and certification-issued state.
- SOP/document persistence now uses backend-backed `SopDocument` and `SopAcknowledgement` records for CRUD, archive state, and acknowledgement capture.
- Frontend services remain fallback-safe when the backend is unavailable, but they now prefer the live API instead of session arrays.

## Phase 053 Data Layer Notes

- Attendance records now persist through `AttendanceRecord` with correction-status updates and note capture flowing through backend APIs.
- Timesheet records now persist through `TimesheetRecord` with submission, approval, and correction-request updates flowing through backend APIs.
- The current schema is sufficient for Phase 053 without additional migration work beyond the already-aligned `notes`, `correctionReason`, `approvedBy`, and `approvedAt` fields.

## Phase 054 Schema Gap

- This schema gap was addressed by the additive Phase 054A alignment changes below.
- Full live persistence work for Scheduling, Leave Requests, and Schedule Swap should proceed only after the additive schema changes are reviewed and migrated safely in a local or development environment.

## Phase 054A Data Layer Notes

- Phase 054A added non-destructive schema alignment for scheduling, PTO/leave, PTO balance tracking, and temporary schedule swaps.
- `ScheduleTemplate` now supports optional employee, department, and position targeting; optional timezone; effective start/end dates; status; rest-day JSON; and notes.
- `ScheduleInstance` now supports optional schedule-template linkage, optional start/end times, break minutes, rest-day and holiday flags, temporary-instance flags, source type, and notes.
- `PtoRequest` now supports leave type, additive start/end date aliases, half-day metadata, paid/unpaid flag, attachment URL, requested/reviewed timestamps, and review notes while preserving the current legacy date fields.
- `PtoBalance` was added for yearly earned/used/remaining leave tracking by employee and leave type.
- `ScheduleSwapRequest` now supports additive requester/target schedule references, requested/target dates, reason, requester/target/manager note fields, acceptance/approval timestamps, manager approver metadata, and a `temporaryOnly` guard defaulting to `true`.
- Recommended local/dev-only migration command: `npx prisma migrate dev --name phase_054a_schedule_leave_swap_alignment`
- Production migration must be reviewed before deploy. No production or destructive migration was run as part of Phase 054A.

## Phase 054B Data Layer Notes

- Scheduling templates and schedule instances now use live backend persistence through `/api/employee-portal/schedules/templates` and `/api/employee-portal/schedules/instances`.
- Leave requests now use live backend persistence through `/api/employee-portal/leave-requests`, with approval and rejection updating request status and review metadata only.
- PTO balances are now exposed through `/api/employee-portal/pto-balances` for future balance-aware UI work.
- Temporary schedule swaps now use live backend persistence through `/api/employee-portal/schedule-swaps`, including request, accept, approve, reject, and cancel actions.
- Backend audit writes now record scheduling-specific action keys for template creation/update, instance creation/update, leave request decisions, and temporary swap workflow actions.
- Remaining mock/session-first modules after Phase 054B include payroll, formula preview workflows, benefits, government contributions, payslips, tool deposits, equipment, inventory, discipline, canteen debt, monthly reviews, internal communication, and dashboard analytics.

## Phase 055 Data Layer Notes

- Payroll profiles now use live backend persistence through `/api/employee-portal/payroll/profiles`.
- Payroll periods now use live backend persistence through `/api/employee-portal/payroll/periods`.
- Payroll components now use live backend persistence through `/api/employee-portal/payroll/components`.
- Stored formulas now use live backend persistence through `/api/employee-portal/formulas`.
- Formula metadata required by the current UI is carried safely inside the existing Prisma `PayrollFormula.variables` JSON field alongside the allowlisted variable names, avoiding destructive schema changes in this phase.
- Formula preview now uses a safe parser/evaluator that only accepts allowlisted variables, numeric literals, parentheses, and the operators `+`, `-`, `*`, and `/`.
- Formula preview remains preparation/preview only. No payroll posting, finalization, or hardcoded statutory rate logic was added.
- Remaining mock/session-first modules after Phase 055 include benefits, government contributions, payslips, tool deposits, equipment, inventory, discipline, canteen debt, monthly reviews, internal communication, and dashboard analytics.

## Phase 056 Data Layer Notes

- Benefits now use live backend persistence through `/api/employee-portal/benefits`.
- Government contribution settings now use live backend persistence through `/api/employee-portal/government-contributions`.
- No additive Prisma schema change was introduced in this phase. To stay within the existing schema safely, richer benefit and government contribution metadata is serialized into the current string-backed Prisma fields and mapped back into API-friendly records at the backend service layer.
- Government contribution settings remain configurable only. No official statutory rates are hardcoded in Prisma records, backend logic, or frontend defaults.
- Benefits remain formula-ready, and payroll remains preparation/preview only with no posting or finalization behavior added in this phase.
- Remaining mock/session-first modules after Phase 056 include payslips, tool deposits, equipment, inventory, discipline, canteen debt, monthly reviews, internal communication, and dashboard analytics.

## Phase 057 Data Layer Notes

- Tool deposits now use live backend persistence through `/api/employee-portal/equipment/tool-deposits`, including refund and forfeit actions.
- Canteen transactions now use live backend persistence through `/api/employee-portal/canteen/transactions`, with cash-payment and payroll-deduction workflow actions.
- Employee debt ledgers now update live through `/api/employee-portal/canteen/ledger` plus backend recalculation hooks for both `canteen` and `tool-deposit` sources.
- Phase 057 required additive schema alignment only: `ToolDeposit` now carries optional resolution metadata, `CanteenTransaction` now carries description, deduction type, settled-amount, notes, and settlement timestamp fields, and `EmployeeDebtLedger` now carries optional notes.
- These schema changes are non-destructive and were documented only; no Prisma migration was run as part of this phase.
- Tool deposits and canteen balances remain payroll-component and formula ready only. No final payroll deduction posting, payroll finalization, or hardcoded statutory payroll rates were added.
- Remaining mock/session-first modules after Phase 057 include equipment registry assignment workflows, inventory, discipline, monthly reviews, internal communication, dashboard analytics, and payslips.

## Phase 058 Data Layer Notes

- Equipment items now use live backend persistence through `/api/employee-portal/equipment/items`.
- Equipment assignments now use live backend persistence through `/api/employee-portal/equipment/assignments`, including assignment linkage, return tracking, and damage-report metadata.
- Inventory items and stock movements now use live backend persistence through `/api/employee-portal/inventory/items` and `/api/employee-portal/inventory/movements`.
- Phase 058 required additive schema alignment only: `EquipmentItem` now carries optional `assignedEmployeeId`, while `InventoryItem` now carries unit, supplier, cost-placeholder, and photo-reference metadata needed by the current UI.
- Stock movement writes now update `InventoryItem.quantityOnHand` through backend logic, and equipment assignment writes now update item assignment status through backend logic.
- Equipment photos, serial-number photos, damage photos, and assignment proof references remain URL/reference metadata only. No file upload or object storage workflow was added.
- Remaining mock/session-first modules after Phase 058 include discipline, monthly reviews, internal communication, dashboard analytics, and payslips.

## Phase 059 Data Layer Notes

- Discipline categories and discipline records now use live backend persistence through `/api/employee-portal/discipline/categories` and `/api/employee-portal/discipline/records`.
- Discipline record writes now persist employee acknowledgement and HR review timestamps when status changes to `acknowledged` or `hr-reviewed`.
- Monthly review templates and performance reviews now use live backend persistence through `/api/employee-portal/reviews/*`.
- Phase 059 required additive schema alignment only: `PerformanceReviewItem` now carries persisted `weight` and `maxScore` fields so live review scoring can match the template weighting rules already used by the frontend.
- Review creation now expands template items into persisted `PerformanceReviewItem` rows, and review item score updates now round-trip through the backend instead of session-only state.
- Remaining mock/session-first modules after Phase 059 include internal communication, dashboard analytics, and payslips.

## Phase 060 Data Layer Notes

- Audit logs remain persisted in `AuditLogEntry`.
- Because this phase stayed within the existing schema constraints, richer audit metadata is stored and projected through a structured payload envelope layered onto the existing persistent audit fields instead of a destructive schema rewrite.
- Expanded audit responses now support actor user ID, actor label, actor role, entity type, entity label, request ID, metadata, and extracted before/after snapshots where available.
- The audit API now supports module, action, entity type, entity ID, actor user ID, and date-range filters plus server-side pagination response metadata.
- No TalyerOS integration was activated, and no payroll finalization or statutory-rate logic was changed as part of this audit expansion.

## Phase 061 Data Layer Notes

- No Prisma schema changes were required for Phase 061.
- The standalone frontend auth screen now consumes the existing `PortalUser`-backed `/auth/login`, `/auth/logout`, and `/auth/me` endpoints.
- Session state remains token-based and isolated to the standalone NCCC Employee Portal. No TalyerOS auth, login, or workflow integration was activated.

## Phase 062 Data Layer Notes

- No Prisma schema changes were required for Phase 062.
- Frontend RBAC enforcement consumes the existing standalone `PortalUser.role` plus the current portal permission mapping; no TalyerOS role or auth coupling was introduced.
- Backend RBAC remains the source of truth for write-route enforcement, while this phase adds frontend permission visibility and admin-only control gating on top of the existing standalone session model.

## Phase 063 Data Layer Notes

- No Prisma schema changes were required for Phase 063.
- API error UX stabilization reuses the existing standalone response envelope and auth endpoints, but now maps response codes into safer frontend-facing standalone portal messages.
- No TalyerOS auth/login or workflow integration was introduced as part of this frontend error-handling pass.

## Phase 064 Data Layer Notes

- No Prisma schema changes were required for Phase 064.
- Pagination, search, filtering, and sort controls added in this phase are frontend browsing enhancements over the existing standalone API-backed datasets, with audit logs continuing to use server-side pagination from Phase 060.
- No TalyerOS integration, payroll finalization, or statutory-rate logic changes were introduced in this phase.

## Phase 065 Data Layer Notes

- Phase 065 adds non-destructive Prisma index definitions to the standalone schema for commonly filtered, sorted, and grouped live-persistence fields across auth, employees, onboarding, training, scheduling, equipment, inventory, discipline, canteen, reviews, SOPs, and audit logs.
- Review aggregation now avoids repeated per-review item filtering in the backend route layer by grouping fetched review items before response mapping.
- These changes are additive only. No destructive migration was run, and any production index rollout still requires reviewed migration steps before deploy.

## Phase 066 Data Layer Notes

- No Prisma schema changes were required for Phase 066.
- Mobile responsiveness improvements are presentation-layer only and do not alter standalone persistence, auth, audit, or formula-ready payroll data behavior.

## Phase 067 Data Layer Notes

- No Prisma schema changes were required for Phase 067.
- Dashboard analytics reuse the existing standalone service layer and currently persisted/live-backed records to calculate workforce, attendance, leave, swap, inventory, canteen, discipline, and review summaries.

## Phase 068 Data Layer Notes

- No Prisma schema changes were required for Phase 068.
- Environment hardening affects backend startup and request handling only; standalone database persistence, auth records, and audit behavior remain unchanged.

## Phase 069 Data Layer Notes

- No Prisma schema changes were required for Phase 069.
- Seed/bootstrap now provisions realistic baseline records for departments, positions, roles, employees, schedules, onboarding templates, and review templates without destructive reset behavior.
- Admin user bootstrap remains env-driven only, and demo seeding can be disabled with `SEED_DEMO_DATA=false`.

## Phase 070 Data Layer Notes

- No Prisma schema changes were required for Phase 070.
- Deployment automation prep in this phase documents how reviewed additive Prisma changes should be validated, generated, and applied before production startup.

## Phase 071 Data Layer Notes

- No Prisma schema changes were required for Phase 071.
- API security hardening in this phase affects request handling, auth validation, and response behavior only; standalone persistence models remain unchanged.

## Phase 072 Data Layer Notes

- No Prisma schema changes were required for Phase 072.
- Formula safety hardening in this phase affects validator and parser behavior only; stored formula records remain preview-oriented and persistence-safe.

## Phase 073 Data Layer Notes

- No Prisma schema changes were required for Phase 073.
- Optimistic concurrency for the first set of high-risk live write flows now uses existing `updatedAt` columns as lightweight stale-record tokens without introducing destructive schema churn.
- Priority update and approval routes now accept an `expectedUpdatedAt` value where practical and return a `409` response with code `STALE_RECORD` when the persisted record changed after the client loaded it.
- Frontend service calls for scheduling/PTO/swaps, equipment returns, discipline status changes, and monthly review status/score updates now pass concurrency tokens and explicitly refetch after conflicts instead of overwriting newer data.
- Employee, department, and position backend routes now also honor optimistic concurrency tokens for future API-backed writes, while the current frontend setup screens remain session-scoped and now guard duplicate submits locally.

## Phase 074 Data Layer Notes

- Phase 074 adds a non-destructive `AttachmentMetadata` Prisma model for upload-ready file/reference metadata without introducing complex object storage.
- Attachment records now support `module`, `entityType`, `entityId`, `referenceKey`, `uploadedBy`, `uploadedAt`, `fileName`, `mimeType`, `fileSize`, `fileUrl`, `referenceUrl`, `description`, `notes`, and `status`.
- Existing live reference fields now sync into attachment metadata records for:
  - SOP document references
  - equipment primary photos
  - serial number photos
  - damage photos
  - assignment proof photos
  - discipline attachments
  - inventory reference photos
- Attachment metadata writes now emit persistent audit events for `attachment.created`, `attachment.updated`, and `attachment.archived`.

## Phase 075 Data Layer Notes

- No Prisma schema changes were required for Phase 075.
- The production QA checklist now explicitly covers attachment metadata verification alongside the existing standalone persistence, auth, RBAC, audit, and preview-only payroll expectations.

## Phase 076 Data Layer Notes

- No Prisma schema changes were required for Phase 076.
- SOP page stabilization in this phase is frontend/service-layer cleanup only; the standalone persistence surface, attachment metadata model, and audit schema remain unchanged.

## Phase 077 Data Layer Notes

- No Prisma schema changes were required for Phase 077.
- Release confirmation revalidated the standalone schema, attachment metadata model, and preview-only payroll boundaries.
- Backend runtime smoke checks in this workspace were limited by missing real environment configuration, so final auth and persistence verification remains a deployment-environment step rather than an assumed pass.
