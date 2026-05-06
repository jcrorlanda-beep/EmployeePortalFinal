# NCCC Employee Portal Database Preparation

## Database Strategy

The MVP includes a Prisma-ready PostgreSQL schema in `prisma/schema.prisma`. The schema is safe to review and evolve, but no migrations are executed by the MVP. When `DATABASE_URL` is unavailable, frontend services use mock-safe in-memory arrays and preserve Prisma-compatible field names.

## Prepared Models

The schema prepares the requested workforce models:

- Employee, Department, Position, EmployeeRole
- OnboardingChecklist, OnboardingStep
- TrainingModule, TrainingAssignment
- AttendanceRecord, TimesheetRecord
- ScheduleTemplate, ScheduleInstance, PtoRequest, ScheduleSwapRequest
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
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
=======
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs


## Phase 004 Data Layer Notes

Onboarding remains session-scoped in the MVP service layer when no live database connection exists. The Phase 004 service contracts are async and database-ready for onboarding templates, template steps, employee onboarding checklists, step progress, and supervisor approval placeholders. Audit placeholder events are recorded for `onboarding.template.created`, `onboarding.template.updated`, `onboarding.assigned`, `onboarding.step.updated`, and `onboarding.approved`. No Prisma migrations were created or executed. A future additive schema revision should persist template status, target role, target department, step metadata, employee checklist assignments, progress notes, completion timestamps, and approval metadata.
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======

## Phase 004 Conflict Recovery Data Notes

- The Phase 004 recovery pass confirmed onboarding data remains session-scoped through async service contracts until a live database connection is introduced.
- Onboarding template, template step, employee checklist, step progress, and approval metadata fields remain Prisma-ready for future additive persistence.
- Existing Phase 001–003 employee, department, position, role, and permission setup assumptions were preserved; no destructive migrations were generated or run.
>>>>>>> theirs
