export type EmployeePortalModuleKey =
  | 'dashboard' | 'employees' | 'departments' | 'positions' | 'onboarding' | 'training' | 'sops'
  | 'timekeeping' | 'timesheets' | 'scheduling' | 'leave' | 'swaps' | 'payroll' | 'formulas'
  | 'benefits' | 'government' | 'payslips' | 'toolDeposits' | 'equipment' | 'inventory'
  | 'discipline' | 'canteen' | 'reviews' | 'communication' | 'auditLogs';

export interface EmployeePortalModuleDefinition {
  key: EmployeePortalModuleKey;
  label: string;
  description: string;
  phase: string;
  status: 'mvp-ready' | 'formula-ready' | 'audit-ready' | 'mock-safe';
}

export const employeePortalModules: EmployeePortalModuleDefinition[] = [
  { key: 'dashboard', label: 'Admin Dashboard', description: 'Workforce overview without TalyerOS login activation.', phase: '025', status: 'mvp-ready' },
  { key: 'employees', label: 'Employees', description: 'Employee records, employment status, and emergency contacts.', phase: '002', status: 'audit-ready' },
  { key: 'departments', label: 'Departments', description: 'Department directory with managers and cost-center notes.', phase: '003', status: 'audit-ready' },
  { key: 'positions', label: 'Positions & Roles', description: 'Position setup and portal role definitions.', phase: '003', status: 'audit-ready' },
  { key: 'onboarding', label: 'Onboarding', description: 'Checklist templates and step assignment tracking.', phase: '004', status: 'audit-ready' },
  { key: 'training', label: 'Training Hub', description: 'Learning modules, assignments, and completion status.', phase: '005', status: 'audit-ready' },
  { key: 'sops', label: 'SOP Library', description: 'Document library metadata and acknowledgment readiness.', phase: '006', status: 'audit-ready' },
  { key: 'timekeeping', label: 'Timekeeping', description: 'Clock event foundation and correction-safe attendance.', phase: '007', status: 'audit-ready' },
  { key: 'timesheets', label: 'Timesheets', description: 'Timesheet review, approvals, and correction placeholders.', phase: '008', status: 'audit-ready' },
  { key: 'scheduling', label: 'Scheduling', description: 'Schedule templates and published schedule instances.', phase: '009', status: 'audit-ready' },
  { key: 'leave', label: 'PTO / Leave', description: 'Leave request intake and approval workflow.', phase: '010', status: 'audit-ready' },
  { key: 'swaps', label: 'Schedule Swaps', description: 'Temporary schedule swap request workflow.', phase: '011', status: 'audit-ready' },
  { key: 'payroll', label: 'Payroll Prep', description: 'Payroll profiles and preparation only; no finalization.', phase: '012', status: 'formula-ready' },
  { key: 'formulas', label: 'Formula Engine', description: 'Configurable formulas for pay, benefits, deductions, and deposits.', phase: '013', status: 'formula-ready' },
  { key: 'benefits', label: 'Benefits', description: 'Benefit rule setup with formula references.', phase: '014', status: 'formula-ready' },
  { key: 'government', label: 'PH Contributions', description: 'Configurable contribution setup; no statutory rates hardcoded.', phase: '015', status: 'formula-ready' },
  { key: 'payslips', label: 'Payslips', description: 'Preview-only payslip line item foundation.', phase: '016', status: 'formula-ready' },
  { key: 'toolDeposits', label: 'Tool Deposits', description: 'Tool deposit deductions and refund tracking.', phase: '017', status: 'formula-ready' },
  { key: 'equipment', label: 'Tools & Equipment', description: 'Registry with photo reference fields and assignment links.', phase: '018/020', status: 'audit-ready' },
  { key: 'inventory', label: 'Inventory', description: 'Inventory items and stock movement logs.', phase: '019', status: 'audit-ready' },
  { key: 'discipline', label: 'Write-Ups', description: 'Warnings with editable discipline categories.', phase: '021', status: 'audit-ready' },
  { key: 'canteen', label: 'Canteen Debt', description: 'Canteen deductions and employee debt ledger.', phase: '022', status: 'formula-ready' },
  { key: 'reviews', label: 'Monthly Reviews', description: 'Editable review templates and monthly scoring records.', phase: '023', status: 'audit-ready' },
  { key: 'communication', label: 'Internal Comms', description: 'Announcements and employee communication placeholders.', phase: '024', status: 'audit-ready' },
  { key: 'auditLogs', label: 'Audit Logs', description: 'Central audit trail for all editable workforce records.', phase: '026', status: 'mvp-ready' },
];

export const portalSafetyNotes = [
  'Separate NCCC Employee Portal entry; TalyerOS auth/login is not integrated or activated.',
  'Payroll remains preparation and preview only until configured formulas and legal review are complete.',
  'PH government contributions are configurable records, not hardcoded statutory rates.',
  'All editable modules include audit-log-ready metadata in service payloads.',
];
