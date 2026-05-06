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
