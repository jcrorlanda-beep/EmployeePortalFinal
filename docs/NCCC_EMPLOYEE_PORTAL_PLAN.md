# NCCC Employee Portal MVP Plan

## Scope

The NCCC Employee Portal is a standalone HR and workforce management MVP for Northeast Car Care Centre. It is intentionally separate from TalyerOS. No TalyerOS authentication, login, routing, or workflow integration is activated in this MVP.

## Architecture

- Frontend: React, TypeScript, and Vite.
- Backend: standalone Node/Express API with Prisma-backed routes, auth middleware, audit capture, and health endpoints in `server/index.ts`.
- Database-ready: PostgreSQL with Prisma schema in `prisma/schema.prisma`.
- Runtime data: mock-safe service arrays with async APIs; no localStorage-first architecture.
- Payroll: formula-ready, preview-only, and not finalization-capable.
- Audit logs: frontend services remain audit-aware and backend write routes now capture database-backed audit entries.

## Phase Completion Summary

| Phase | Module | MVP Status |
| --- | --- | --- |
| 001 | Foundation, split files, pages, services, types, docs, Prisma-ready schema | Complete |
| 002 | Employee CRUD | Complete with usable frontend create/update forms, employee list, search/filtering, status badges, and profile summary card |
| 003 | Departments / positions / roles | Complete with department codes/leads/sort order, position codes/default roles, configurable roles, and permission group foundations |
| 004 | Onboarding checklist | Complete with template CRUD foundation, step editor, employee checklist assignment, progress tracking, and supervisor approval placeholder |
| 005 | Training hub | Complete with module CRUD foundation, filters, employee assignments, completion tracking, and certification-ready fields |
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
| 028-050 | Standalone backend, persistence, auth, RBAC, env, seed, QA, deployment prep | Complete foundation for deployable multiuser release |
| 052 | Live API wiring: onboarding, training, SOP | Complete with API-first frontend services, backend persistence routes, fallback mode, and backend-unavailable UX states |
| 053 | Live API wiring: timekeeping, timesheets | Complete with API-backed attendance/timesheet workflows, correction persistence, fallback mode, and backend-unavailable UX states |
| 054 | Live API wiring: scheduling, PTO, swaps | Blocked pending additive schema alignment for rest days, PTO metadata, and swap notes/approval details |
| 054A | Scheduling / PTO / swap Prisma alignment | Complete with non-destructive schema alignment and reviewed migration guidance only |
| 054B | Live API wiring: scheduling, PTO, temporary swaps | Complete with standalone backend persistence, explicit backend-unavailable UX, and no local fallback |
| 055 | Live API wiring: payroll profiles + formula engine | Complete with standalone backend persistence, formula preview safety checks, and payroll still limited to preparation/preview |
| 056 | Live API wiring: benefits + PH government contributions | Complete with standalone backend persistence, explicit configurable-only warnings, and no hardcoded statutory rates |
| 057 | Live API wiring: tool deposits + canteen debt | Complete with standalone backend persistence, live balance updates, refund/forfeit actions, and payroll-deduction-ready references only |
| 058 | Live API wiring: equipment + inventory | Complete with standalone backend persistence, assignment/return workflows, stock movement updates, and reference URL fields only |
| 059 | Live API wiring: discipline + monthly reviews | Complete with standalone backend persistence, acknowledgement/HR approval fields, and review item score tracking |
| 060 | Persistent audit expansion | Complete with persistent audit metadata projection, filters/pagination, and expanded snapshot detail support |
| 061 | Standalone frontend auth screens | Complete with standalone login UX, protected portal wrapper, logout flow, and explicit session/backend states |
| 062 | Frontend RBAC enforcement | Complete with permission helper hooks, guarded dashboard access, and admin-only role-permission controls |
| 063 | API error UX stabilization | Complete with safer shared API messaging, retry affordances, and clearer auth/backend failure states |
| 064 | Pagination + search + filtering | Complete with scalable list controls across employees, SOPs, audit logs, equipment, inventory, discipline, canteen transactions, and monthly reviews |
| 065 | Database performance pass | Complete with additive Prisma indexes and light query cleanup for live review aggregation |
| 066 | Mobile responsiveness pass | Complete with mobile/tablet layout tuning for forms, tables, navigation, cards, and action flows |
| 067 | Dashboard analytics pass | Complete with live summary metrics for workforce, attendance, leave, swaps, inventory, canteen balances, and reviews |
| 068 | Environment hardening | Complete with startup env validation, secret-safe warnings, and stricter CORS parsing |
| 069 | Seed + demo data improvements | Complete with realistic baseline departments, roles, employees, schedules, and templates behind an env toggle |
| 070 | Deployment automation prep | Complete with production-oriented scripts and expanded standalone deployment guidance |
| 071 | API security pass | Complete with lightweight rate limiting, tighter JWT checks, safer headers, and generic 500 responses |
| 072 | Formula safety hardening | Complete with stricter parser guards, variable validation, and expression complexity limits |

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
- Phase 002 added employee CRUD frontend foundations, department setup, position setup, and audit placeholder events for create/update actions.
- Phase 003 expanded department/position administration and added configurable roles plus permission group definitions without auth enforcement.
- Phase 004 added onboarding template, employee checklist, progress tracking, and supervisor approval placeholder workflows without auth enforcement.
- Phase 005 added training module, assignment, completion tracking, and certification-ready workflows without quiz/video engine implementation.
- Phase 006 added SOP/document records, versioning, ownership, acknowledgement-ready fields, archive workflow, and placeholder acknowledgement events.
- Phase 028-050 added a standalone Express API structure, Prisma-backed route layer, standalone JWT auth foundation, RBAC guards, persistent audit route support, safe seed/bootstrap, env scaffolding, deployment docs, and QA checklist coverage.
- Phase 052 switched onboarding, training, and SOP frontend services to API-first persistence with graceful fallback when standalone auth or the backend is unavailable.
- Phase 053 switched attendance and timesheet frontend services to API-first persistence with correction and approval workflow refresh behavior.
- Phase 054A added non-destructive schema alignment for scheduling, PTO/leave, PTO balances, and temporary schedule swaps.
- Phase 054B wired scheduling, leave requests, PTO balances, and temporary schedule swaps to the standalone backend API without silent mock fallback.
- Phase 055 wired payroll profiles, payroll periods, payroll components, stored formulas, and safe formula preview to the standalone backend API.
- Phase 056 wired benefits and government contribution settings to the standalone backend API with explicit configurable-only warnings and no silent mock fallback.
- Phase 057 wired tool deposits, canteen transactions, and employee debt ledgers to the standalone backend API with live balance recalculation and no final payroll deduction posting.
- Phase 058 wired equipment registry, equipment assignments/returns, inventory items, and stock movements to the standalone backend API with reference URL support only.
- Phase 059 wired discipline categories/records and monthly review templates/reviews to the standalone backend API with acknowledgement and approval workflow persistence.
- Phase 060 expanded persistent audit logs with richer actor/entity metadata projection, filters, pagination, and snapshot detail support without activating any TalyerOS integration.
- Phase 061 added standalone frontend login/session UX with a protected portal wrapper, logout flow, unauthorized state, and explicit backend-unavailable handling without any TalyerOS auth integration.
- Phase 062 added frontend RBAC helpers, permission-aware dashboard cards, route/session context plumbing, and admin-only role-permission controls without any TalyerOS integration.
- Phase 063 improved the shared frontend API error layer with safer auth/backend/validation messages and explicit retry affordances for standalone portal users.
- Phase 064 added scalable browsing controls including pagination, search, filters, and sort options across the targeted employee-portal record lists.
- Phase 065 added additive Prisma indexes on commonly filtered and sorted fields plus a light review-query aggregation cleanup, without running destructive migrations.
- Phase 066 improved small-screen ergonomics across portal navigation, auth, forms, tables, cards, and approval/action controls without changing standalone business logic.
- Phase 067 upgraded the dashboard from a static module launcher into a live operational summary surface backed by the current portal service layer.
- Phase 068 hardened runtime configuration with environment validation, startup warnings, and safer CORS handling without logging secrets.
- Phase 069 upgraded the seed/bootstrap flow with realistic baseline demo records while keeping admin credentials env-driven only.
- Phase 070 expanded deployment prep with production-oriented scripts, Prisma deploy steps, generic backend hosting notes, and frontend hosting guidance.
- Phase 071 hardened the standalone API with lightweight rate limiting, tighter auth token validation, request-size limits, and safer server responses.
- Phase 072 tightened formula preview safety with stronger input validation, parser complexity limits, and stricter variable normalization.
- Database schema contains all requested model names.
- TalyerOS integration remains inactive.
- Build command: `npm run build`.

## Phase 002 Notes

- Employee Management now supports session-scoped create/update flows, employee number/name validation, search and filtering by name, employment status, and department.
- Departments and positions now support session-scoped create/update flows with active/inactive status instead of deletion.
- Employee records include preferred name, role, contact details, emergency contact details, notes, and optional department/position assignment.
- Every employee, department, and position create/update path records a placeholder audit event through the audit log service.
- Service methods remain async and database-ready; no localStorage-first architecture, Prisma migrations, or TalyerOS integration were added.

## Phase 003 Notes

- Department administration now includes department code, name, description, optional manager/lead employee, active/inactive status, sort order, edit workflow, and deactivation instead of deletion.
- Position administration now includes position code, linked department, description, default role, active/inactive status, edit workflow, and deactivation instead of deletion.
- Role administration now includes the required role foundation list, session-scoped role create/update, and permission assignment workflows.
- Permission groups are definitions only and are not used for real auth/login enforcement in Phase 003.
- Placeholder audit events were added for department deactivation, position deactivation, role create/update, and role permission updates.
- No TalyerOS integration, backend auth changes, payroll formula changes, package changes, or Prisma migrations were added.

## Phase 004 Notes

- Onboarding template administration now supports name, description, target role, optional target department, active/inactive status, and editable steps.
- Template steps now include title, description, category, required flag, estimated minutes, and sort order.
- Employee onboarding checklists can be assigned from templates and tracked in session-scoped service state.
- Step progress supports Not Started, In Progress, Completed, and Skipped statuses with notes and completion timestamps.
- Supervisor approval is a placeholder action only; no login/auth permission enforcement was added.
- Onboarding completion does not automatically activate employees.
- Placeholder audit events were added for template create/update, checklist assignment, step progress updates, and approval.
- No TalyerOS integration, payroll formula changes, package changes, or Prisma migrations were added.

## Phase 005 Notes

- Training module administration now supports title, description, category, level, optional target role, estimated minutes, content type, content reference, status, and certification eligibility.
- Training categories and levels can be filtered on the Training page.
- Employee training assignments now track assigned date, optional due date, completion status, score, supervisor notes, completion timestamp, and certification issuance readiness.
- Certification support is record-ready only; no external certificate generation or credentialing integration was added.
- SOP, video, checklist, quiz, hands-on, and external link content types are represented by metadata only; no quiz engine or video upload workflow was added.
- Placeholder audit events were added for training module create/update, assignment, progress update, completion, and certification issuance.
- No TalyerOS integration, auth enforcement, package changes, Prisma migrations, or payroll formula changes were added.

## Phase 006 Notes

- SOP/document administration now supports title, description, category, document type, version, owner, file reference, acknowledgement-required flag, status, and effective date.
- SOP/document records can be filtered by category and status.
- Document archive is a status update only; no files are deleted and no document storage integration was added.
- Employee acknowledgement records are placeholder/session-scoped and do not enforce login, auth, e-signature, or policy acceptance rules.
- Placeholder audit events were added for SOP/document create/update, acknowledgement, and archive actions.
- No TalyerOS integration, auth enforcement, package changes, Prisma migrations, video uploads, or external document storage integration were added.

## Phase 028-050 Notes

- The backend now runs as a standalone Express API with dedicated `routes`, `controllers`, `services`, `middleware`, `validators`, `utils`, `types`, and Prisma client scaffolding.
- Standalone NCCC portal auth now uses `PortalUser`, `bcryptjs`, JWT signing, `auth/me`, and guarded backend routes without any TalyerOS dependency.
- RBAC foundations were added through permission constants, role-to-permission mapping, backend permission middleware, and route-level write guards.
- Backend persistence routes now cover employees, departments, positions, roles, onboarding, training, SOP, timekeeping, scheduling, payroll, benefits, canteen, equipment, inventory, discipline, reviews, and audit log filtering.
- Formula preview remains preview-only and safe; no `eval()`, no `Function` constructor, and no payroll finalization were added.
- Environment scaffolding now includes `.env.example`, Vite API base configuration, backend port and CORS configuration, seed/bootstrap support, deployment documentation, and a manual QA checklist.
- The frontend remains standalone and now includes a lightweight current-user/session hook plus permission-aware module visibility when a standalone portal session exists.

## Phase 052 Notes

- Onboarding, training, and SOP frontend services now prefer the standalone backend API and fall back to in-memory service data only when the backend is unavailable or no standalone portal session token is present.
- Onboarding now persists templates, template steps, employee checklist assignments, step progress updates, and supervisor approval placeholders through backend routes.
- Training now persists module CRUD, employee assignments, progress updates, completion, and certification issuance readiness through backend routes.
- SOP/document library now persists document CRUD, archive actions, and acknowledgement records through backend routes.
- Each live-wired page now exposes loading, backend-unavailable, and fallback-state messaging instead of silently reverting to mock behavior.

## Phase 053 Notes

- Attendance records now persist through backend APIs with API-backed clock events, correction requests, and frontend refresh behavior after write actions.
- Timesheet records now persist through backend APIs with submission, approval, and correction-request status updates.
- The Timekeeping and Timesheets pages now expose loading, backend-unavailable, and fallback-state messaging consistent with the Phase 052 modules.
- Frontend fallback paths still record placeholder audit entries when the backend is unavailable, while backend write routes continue to capture persistent audit records when live.

## Phase 054 Blocker

- This blocker was resolved by Phase 054A schema alignment work.
- Full live persistence wiring for Scheduling, Leave Requests, and Schedule Swap still remains a follow-up implementation phase after the additive schema changes are reviewed and migrated safely in a local or development environment.

## Phase 054A Notes

- Phase 054A added non-destructive schema alignment for scheduling templates, schedule instances, PTO/leave requests, PTO balances, and temporary schedule swaps.
- The schema now supports individual or department-level schedule templates, optional timezone and effective date windows, rest-day metadata, instance-level temporary flags, PTO review metadata, attachment references, and richer swap approval/notes fields.
- Migration guidance is documented for local and development review only: `npx prisma migrate dev --name phase_054a_schedule_leave_swap_alignment`.
- Production migration must be reviewed before deploy, and full live frontend persistence wiring for Scheduling, Leave Requests, and Schedule Swap remains deferred to the next phase.

## Phase 054B Notes

- Scheduling templates and schedule instances now load and write through live backend routes under `/api/employee-portal/schedules/*`.
- Leave requests and PTO balances now load and write through live backend routes under `/api/employee-portal/leave-requests` and `/api/employee-portal/pto-balances`.
- Temporary schedule swaps now load and write through live backend routes under `/api/employee-portal/schedule-swaps/*` with accept, approve, reject, and cancel actions.
- Scheduling-related pages now surface explicit backend-unavailable errors instead of silently persisting to mock or session state.
- Approved swaps remain temporary only and do not alter regular schedule templates.
- Remaining mock/session-first modules still include payroll profiles, formula engine preview UI, benefits, government contributions, payslips, tool deposits, equipment, inventory, discipline, canteen debt, monthly reviews, internal communication, and dashboard analytics.

## Phase 055 Notes

- Payroll profiles, payroll periods, and payroll components now load and write through live backend routes under `/api/employee-portal/payroll/*`.
- Formula records and formula preview now load and write through live backend routes under `/api/employee-portal/formulas`.
- Formula preview remains preview only and uses a safe parser with allowlisted variables, allowlisted operators, suspicious-character rejection, and no `eval()` or `Function` constructor.
- Payroll remains preparation/preview only. No payroll posting, finalization, or legal/statutory claim logic was added.
- Payroll and formula pages now surface loading, backend-unavailable, and API error states instead of silently persisting to mock or session state.
- Remaining mock/session-first modules after Phase 055 include benefits, government contributions, payslips, tool deposits, equipment, inventory, discipline, canteen debt, monthly reviews, internal communication, and dashboard analytics.

## Phase 056 Notes

- Benefits now load and write through live backend routes under `/api/employee-portal/benefits`.
- Government contribution settings now load and write through live backend routes under `/api/employee-portal/government-contributions`.
- Benefits and government contribution pages now surface loading, backend-unavailable, and API error states instead of silently persisting to mock or session state.
- Government contribution setup remains configurable only. No official statutory rates are hardcoded in the frontend or backend.
- Benefits remain formula-ready and government contribution settings remain rule-driven. Payroll still remains preparation/preview only.
- Remaining mock/session-first modules after Phase 056 include payslips, tool deposits, equipment, inventory, discipline, canteen debt, monthly reviews, internal communication, and dashboard analytics.

## Phase 057 Notes

- Tool deposits now load and write through live backend routes under `/api/employee-portal/equipment/tool-deposits`.
- Canteen transactions and employee debt ledgers now load and write through live backend routes under `/api/employee-portal/canteen/transactions` and `/api/employee-portal/canteen/ledger`.
- Tool deposit workflows now support refund and forfeit actions, with live employee debt ledger recalculation after each change.
- Canteen workflows now support manual payment recording, payroll-deduction marking, and live employee debt ledger recalculation after each change.
- Tool deposits and canteen transactions remain payroll-component and formula ready only. No final payroll deduction posting or payroll finalization behavior was added.
- Remaining mock/session-first modules after Phase 057 include equipment registry assignment workflows, inventory, discipline, monthly reviews, internal communication, dashboard analytics, and payslips.

## Phase 058 Notes

- Equipment items now load and write through live backend routes under `/api/employee-portal/equipment/items`.
- Equipment assignments now load and write through live backend routes under `/api/employee-portal/equipment/assignments`, including return processing and damage reporting.
- Inventory items and stock movements now load and write through live backend routes under `/api/employee-portal/inventory/items` and `/api/employee-portal/inventory/movements`.
- Equipment and inventory pages now surface loading, backend-unavailable, and API error states instead of silently persisting to mock or session state.
- Photo and proof fields remain URL/reference metadata only. No file upload or object storage workflow was added.
- Remaining mock/session-first modules after Phase 058 include discipline, monthly reviews, internal communication, dashboard analytics, and payslips.

## Phase 059 Notes

- Discipline categories and records now load and write through live backend routes under `/api/employee-portal/discipline/categories` and `/api/employee-portal/discipline/records`.
- Discipline records now persist employee acknowledgement and HR review timestamps through explicit status updates.
- Monthly review templates and reviews now load and write through live backend routes under `/api/employee-portal/reviews/*`, including review item score updates and workflow status changes.
- Monthly review item weights and max scores are now persisted instead of being held only in frontend session state.
- Discipline and review pages now surface loading, backend-unavailable, and API error states instead of silently persisting to mock or session state.
- Remaining mock/session-first modules after Phase 059 include internal communication, dashboard analytics, and payslips.

## Phase 060 Notes

- Audit logs remain persistent and now project richer actor and entity metadata through a shared backend audit helper and API mapping layer.
- The audit API now supports filters for module, action, entity type, entity ID, actor user ID, and date range, plus page and page-size pagination with newest-first sorting.
- The Audit Logs page now shows loading, backend-unavailable, and error states, along with filters, paginated results, and a detail panel for before/after snapshots and metadata where available.
- Before/after snapshots are supported where routes already provide them, while older generic audit middleware records continue to render safely through the expanded projection layer.
- No TalyerOS integration, auth coupling, payroll finalization logic, or hardcoded PH rates were added in this phase.

## Phase 061 Notes

- The Employee Portal now opens with a standalone sign-in screen instead of rendering anonymous users directly into the shell.
- Frontend session UX now supports login, logout, current-user display, expired-session messaging, unauthorized-state handling, and backend-unavailable messaging without any TalyerOS auth dependency.
- Authenticated users keep their existing module navigation, while users with no permitted modules now see a clear access-limited state instead of an ambiguous empty shell.
- This phase did not add payroll finalization logic, hardcoded PH statutory rates, destructive migrations, or TalyerOS integration.

## Phase 062 Notes

- Frontend RBAC now uses a shared session context plus a dedicated permission helper hook instead of duplicating ad hoc role checks in pages.
- Dashboard module cards now respect standalone portal permissions and show disabled explanations when the signed-in user lacks access.
- Role and permission editing controls in the Positions page are now admin-only in the frontend, while the rest of the module remains visible to authorized non-admin operators.
- This phase did not add TalyerOS auth/workflow integration, payroll finalization logic, hardcoded PH statutory rates, or Prisma migrations.

## Phase 063 Notes

- Shared frontend API error handling now normalizes backend-unavailable, invalid-credential, expired-session, unauthorized, and validation-style responses into clearer standalone portal messages.
- The standalone login screen and Audit Logs page now expose explicit retry actions instead of leaving users at a dead-end error state.
- Existing live API pages benefit from the safer centralized error wording without changing their core CRUD behavior.
- This phase did not add TalyerOS integration, payroll finalization logic, hardcoded PH statutory rates, or Prisma migrations.

## Phase 064 Notes

- Employees, SOP documents, equipment items, inventory items, discipline records, canteen transactions, and monthly reviews now support client-side search, filter, sort, and pagination controls for more scalable browsing.
- Audit logs keep their server-side filter and pagination behavior from Phase 060, and now add quick-search and sort controls over the loaded result set for faster triage.
- This phase stayed frontend-focused and did not change TalyerOS integration status, payroll finalization behavior, hardcoded PH statutory rates, or Prisma schema state.

## Phase 065 Notes

- Prisma schema performance tuning now includes additive indexes on the fields most frequently used by live routes for filtering, sorting, and per-employee lookups.
- Review list aggregation now groups fetched review items in memory once instead of repeatedly filtering the full item array for every review row.
- No destructive migration was run in this phase. These index changes still require a reviewed additive migration before production deployment.

## Phase 066 Notes

- Mobile and tablet responsiveness now better supports dense forms, table-based modules, navigation, dashboard cards, and approval-heavy workflows through tighter spacing and stacked action layouts.
- Table containers now scroll safely on narrow screens instead of forcing layout breakage, while key buttons expand to full width for easier touch interaction.
- This phase did not change TalyerOS integration status, payroll finalization behavior, hardcoded PH statutory rates, or Prisma schema state.

## Phase 067 Notes

- The dashboard now surfaces live summary metrics for employees, onboarding, training, attendance, timesheets, PTO, swaps, inventory alerts, canteen balances, and pending reviews.
- Recent discipline records now appear directly on the dashboard so supervisors and HR leads can spot issues without drilling into the write-up module first.
- Dashboard metric cards now route directly into the related modules, while preserving the standalone RBAC-aware module access behavior from Phase 062.

## Phase 068 Notes

- Backend startup now validates production-critical environment variables and emits clear warnings when local or staging configuration is incomplete.
- CORS handling now parses configured origin lists explicitly and avoids permissive wildcard behavior in production unless the environment is deliberately configured that way.
- Startup logs remain secret-safe: configuration warnings name missing or risky keys without printing secret values.

## Phase 069 Notes

- Seed/bootstrap now creates a more useful standalone demo baseline including departments, positions, roles, employees, schedule templates, schedule instances, onboarding template steps, and a default review template.
- Demo record seeding is controlled by `SEED_DEMO_DATA`, while admin bootstrap credentials remain env-driven through `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_ROLE`.
- No real passwords, hardcoded secrets, destructive resets, or TalyerOS integration were added in this phase.

## Phase 070 Notes

- Production-oriented package scripts now cover frontend-only builds, type-check builds, backend production startup, and a combined deploy check.
- Deployment documentation now includes explicit Prisma deploy sequencing, backend hosting notes for Railway/Render-style platforms, frontend hosting notes for Vercel/static deployment, and health-check guidance.
- This phase did not introduce host-specific lock-in, TalyerOS integration, hardcoded PH statutory rates, or payroll finalization logic.

## Phase 071 Notes

- The standalone API now uses lightweight in-memory rate limiting for both the overall `/api/employee-portal` surface and the auth login route.
- JWT verification now restricts allowed algorithms and rejects malformed token payloads earlier, while request parsing now uses an explicit JSON body-size limit.
- Server responses now keep 500-level errors generic, and baseline security headers are set without changing TalyerOS integration status or payroll behavior.

## Phase 072 Notes

- Formula create, update, and preview requests now enforce uppercase formula-code and variable-name rules, unique variable lists, finite preview values, and tighter size limits.
- The preview evaluator now rejects overlong expressions, excessive token counts, and deeply nested expressions before evaluation proceeds.
- Formula preview remains preview-only, with no `eval()`, no arbitrary execution path, and no payroll posting or finalization behavior.

## Phase 073 Notes

- Optimistic concurrency safeguards now protect the highest-risk live write routes first: employee setup APIs, scheduling/PTO/swaps, equipment/returns, inventory item updates, discipline status changes, and monthly review scoring/status changes.
- Backend update and approval routes now accept `expectedUpdatedAt` where practical and return `409 STALE_RECORD` with a clear refresh-and-retry message instead of silently overwriting newer changes.
- Frontend pages for the priority flows now guard against duplicate submits while requests are pending, and they refetch after successful mutations and stale-record conflicts.
- The older session-scoped Employees, Departments, and Positions pages also now block duplicate submits, while their matching backend routes are prepared for optimistic concurrency when those records are fully live-wired.
- No TalyerOS integration, hardcoded PH statutory rates, payroll finalization logic, or destructive Prisma migration was added in this phase.

## Phase 074 Notes

- A standalone attachment metadata layer now exists for upload-ready records without introducing file storage, object storage, or committed real file URLs.
- The backend now supports attachment metadata records with module/entity linkage, upload attribution, file naming and mime metadata, reference URLs, notes, and `Active`/`Archived` status.
- Existing live reference fields now sync into attachment metadata records for SOP documents, equipment photos, serial number photos, damage photos, assignment proof photos, discipline attachments, and inventory reference photos.
- Attachment metadata routes now support listing, creating, updating, and archiving metadata records, with attachment audit events for create, update, and archive actions.
- No TalyerOS integration, payroll finalization logic, hardcoded PH statutory rates, or destructive Prisma migration was added in this phase.

## Phase 075 Notes

- The manual QA checklist now covers standalone auth, RBAC, all live-wired business modules, attachment metadata, mobile layout, and deployment-environment checks.
- The checklist explicitly calls out concurrency conflict handling, preview-only payroll rules, configurable-only government contribution setup, and the no-TalyerOS requirement.
- This phase is documentation-focused and does not add new runtime behavior, destructive migrations, payroll finalization logic, or hardcoded PH statutory rates.

## Phase 076 Notes

- Low-risk cleanup and stabilization work now aligns older SOP page submit/archive/acknowledgement behavior with the newer live API pages by adding pending-state guards and clearer save errors.
- Release documentation and QA notes now reflect the attachment metadata layer and the current standalone release boundary more consistently.
- This phase did not add new major features, TalyerOS integration, payroll finalization behavior, hardcoded PH statutory rates, or destructive Prisma migration steps.

## Phase 077 Notes

- Production-ready confirmation artifacts are now documented in `docs/NCCC_EMPLOYEE_PORTAL_PRODUCTION_READY.md`.
- Final release checks reconfirmed that frontend build and Prisma schema validation pass, and that the backend boots and serves health endpoints when runtime configuration is present.
- This workspace did not have a real standalone `.env` or seeded admin credentials loaded, so full auth and database-backed module smoke tests remain an environment-backed release step rather than a claim made without evidence.
- No TalyerOS integration, destructive migration, payroll finalization logic, or hardcoded PH statutory rates were introduced during release confirmation.
