import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const shouldSeedDemoData = (process.env.SEED_DEMO_DATA ?? 'true').toLowerCase() === 'true';

const seedDepartments = [
  { name: 'Service Desk', managerName: 'Unassigned', notes: 'Front-desk coordination and customer intake.', active: true },
  { name: 'Workshop', managerName: 'Unassigned', notes: 'Mechanical operations and bay scheduling.', active: true },
  { name: 'HR & Administration', managerName: 'Unassigned', notes: 'Standalone employee portal administration and HR operations.', active: true },
  { name: 'Parts & Inventory', managerName: 'Unassigned', notes: 'Stock handling, purchasing coordination, and inventory control.', active: true },
  { name: 'Canteen', managerName: 'Unassigned', notes: 'Canteen operations and employee balance tracking.', active: true },
];

const seedPositions = [
  { title: 'HR Manager', departmentName: 'HR & Administration', level: 'manager', active: true },
  { title: 'Branch Manager', departmentName: 'Service Desk', level: 'manager', active: true },
  { title: 'Chief Mechanic', departmentName: 'Workshop', level: 'lead', active: true },
  { title: 'Senior Mechanic', departmentName: 'Workshop', level: 'senior', active: true },
  { title: 'Service Advisor', departmentName: 'Service Desk', level: 'specialist', active: true },
  { title: 'Inventory Coordinator', departmentName: 'Parts & Inventory', level: 'specialist', active: true },
  { title: 'Canteen Staff', departmentName: 'Canteen', level: 'staff', active: true },
];

const seedRoles = [
  {
    name: 'Admin',
    description: 'Standalone NCCC Employee Portal administrator.',
    permissions: ['admin.full', 'audit.view'],
  },
  {
    name: 'HR Manager',
    description: 'HR operations, onboarding, training, and review management.',
    permissions: ['employees.manage', 'onboarding.manage', 'training.manage', 'sop.manage', 'reviews.manage', 'audit.view', 'roles.manage'],
  },
  {
    name: 'Branch Manager',
    description: 'Operational scheduling, leave review, and payroll preparation oversight.',
    permissions: ['schedules.manage', 'leave.approve', 'payroll.manage', 'reviews.manage', 'audit.view'],
  },
  {
    name: 'Chief Mechanic',
    description: 'Workshop lead for tools, equipment, inventory, and training.',
    permissions: ['equipment.manage', 'inventory.manage', 'training.manage'],
  },
  {
    name: 'Inventory Staff',
    description: 'Inventory and stock movement management.',
    permissions: ['inventory.manage', 'equipment.manage'],
  },
  {
    name: 'Canteen Staff',
    description: 'Canteen transaction and debt tracking.',
    permissions: ['canteen.manage'],
  },
];

const seedEmployees = [
  {
    employeeNumber: 'NCCC-001',
    firstName: 'Mara',
    lastName: 'Santos',
    status: 'active',
    hireDate: '2025-01-06',
    departmentName: 'HR & Administration',
    positionTitle: 'HR Manager',
    email: 'mara.santos@nccc.local',
    emergencyContact: 'Liza Santos · 0917-555-0001',
  },
  {
    employeeNumber: 'NCCC-002',
    firstName: 'Paolo',
    lastName: 'Rivera',
    status: 'active',
    hireDate: '2025-02-10',
    departmentName: 'Service Desk',
    positionTitle: 'Branch Manager',
    email: 'paolo.rivera@nccc.local',
    emergencyContact: 'Ana Rivera · 0917-555-0002',
  },
  {
    employeeNumber: 'NCCC-003',
    firstName: 'Jun',
    lastName: 'Mercado',
    status: 'active',
    hireDate: '2025-02-18',
    departmentName: 'Workshop',
    positionTitle: 'Chief Mechanic',
    email: 'jun.mercado@nccc.local',
    emergencyContact: 'Rina Mercado · 0917-555-0003',
  },
  {
    employeeNumber: 'NCCC-004',
    firstName: 'Leah',
    lastName: 'Torres',
    status: 'probation',
    hireDate: '2026-03-01',
    departmentName: 'Workshop',
    positionTitle: 'Senior Mechanic',
    email: 'leah.torres@nccc.local',
    emergencyContact: 'Marco Torres · 0917-555-0004',
  },
  {
    employeeNumber: 'NCCC-005',
    firstName: 'Niko',
    lastName: 'Salcedo',
    status: 'onboarding',
    hireDate: '2026-04-15',
    departmentName: 'Parts & Inventory',
    positionTitle: 'Inventory Coordinator',
    email: 'niko.salcedo@nccc.local',
    emergencyContact: 'Ella Salcedo · 0917-555-0005',
  },
];

const reviewTemplateItems = [
  { label: 'Quality', weight: 30, maxScore: 10 },
  { label: 'Attendance', weight: 20, maxScore: 10 },
  { label: 'Teamwork', weight: 25, maxScore: 10 },
  { label: 'Productivity', weight: 25, maxScore: 10 },
];

async function seedDepartmentRecords() {
  for (const department of seedDepartments) {
    const existingDepartment = await prisma.department.findFirst({ where: { name: department.name } });
    if (existingDepartment) {
      await prisma.department.update({ where: { id: existingDepartment.id }, data: department });
    } else {
      await prisma.department.create({ data: department });
    }
  }
}

async function seedRoleRecords() {
  for (const role of seedRoles) {
    const existingRole = await prisma.employeeRole.findFirst({ where: { name: role.name } });
    if (existingRole) {
      await prisma.employeeRole.update({ where: { id: existingRole.id }, data: role });
    } else {
      await prisma.employeeRole.create({ data: role });
    }
  }
}

async function seedPositionRecords() {
  const departments = await prisma.department.findMany();
  const departmentIdByName = new Map(departments.map((department) => [department.name, department.id]));

  for (const position of seedPositions) {
    const departmentId = departmentIdByName.get(position.departmentName);
    if (!departmentId) continue;

    const existingPosition = await prisma.position.findFirst({
      where: { title: position.title, departmentId },
    });
    const data = { title: position.title, departmentId, level: position.level, active: position.active };
    if (existingPosition) {
      await prisma.position.update({ where: { id: existingPosition.id }, data });
    } else {
      await prisma.position.create({ data });
    }
  }
}

async function seedEmployeeRecords() {
  const departments = await prisma.department.findMany();
  const positions = await prisma.position.findMany();
  const departmentIdByName = new Map(departments.map((department) => [department.name, department.id]));
  const positionIdByTitle = new Map(positions.map((position) => [position.title, position.id]));

  for (const employee of seedEmployees) {
    const departmentId = departmentIdByName.get(employee.departmentName);
    const positionId = positionIdByTitle.get(employee.positionTitle);
    if (!departmentId || !positionId) continue;

    const data = {
      employeeNumber: employee.employeeNumber,
      firstName: employee.firstName,
      lastName: employee.lastName,
      status: employee.status,
      hireDate: new Date(employee.hireDate),
      departmentId,
      positionId,
      email: employee.email,
      emergencyContact: employee.emergencyContact,
    };

    const existingEmployee = await prisma.employee.findFirst({ where: { employeeNumber: employee.employeeNumber } });
    if (existingEmployee) {
      await prisma.employee.update({ where: { id: existingEmployee.id }, data });
    } else {
      await prisma.employee.create({ data });
    }
  }
}

async function seedDemoSchedulesAndTemplates() {
  if (!shouldSeedDemoData) return;

  const departments = await prisma.department.findMany();
  const employees = await prisma.employee.findMany();
  const positions = await prisma.position.findMany();

  const workshopDepartmentId = departments.find((department) => department.name === 'Workshop')?.id;
  const serviceDeskDepartmentId = departments.find((department) => department.name === 'Service Desk')?.id;
  const chiefMechanicPositionId = positions.find((position) => position.title === 'Chief Mechanic')?.id;

  const scheduleTemplates = [
    {
      name: 'Workshop Day Shift',
      departmentId: workshopDepartmentId,
      positionId: chiefMechanicPositionId,
      startTime: '08:00',
      endTime: '17:00',
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      restDays: ['Sun'],
      status: 'active',
    },
    {
      name: 'Service Desk Split Shift',
      departmentId: serviceDeskDepartmentId,
      startTime: '09:00',
      endTime: '18:00',
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      restDays: ['Sun'],
      status: 'active',
    },
  ];

  for (const template of scheduleTemplates) {
    const existing = await prisma.scheduleTemplate.findFirst({ where: { name: template.name } });
    if (existing) {
      await prisma.scheduleTemplate.update({ where: { id: existing.id }, data: template });
    } else {
      await prisma.scheduleTemplate.create({ data: template });
    }
  }

  const savedTemplates = await prisma.scheduleTemplate.findMany();
  const demoInstanceDate = new Date().toISOString().slice(0, 10);

  for (const employee of employees.slice(0, 3)) {
    const template = savedTemplates[employee.departmentId === workshopDepartmentId ? 0 : 1];
    if (!template) continue;

    const existingInstance = await prisma.scheduleInstance.findFirst({
      where: { employeeId: employee.id, workDate: new Date(demoInstanceDate) },
    });

    const instanceData = {
      employeeId: employee.id,
      templateId: template.id,
      scheduleTemplateId: template.id,
      workDate: new Date(demoInstanceDate),
      startTime: template.startTime,
      endTime: template.endTime,
      breakMinutes: 60,
      status: 'published',
      sourceType: 'Regular',
    };

    if (existingInstance) {
      await prisma.scheduleInstance.update({ where: { id: existingInstance.id }, data: instanceData });
    } else {
      await prisma.scheduleInstance.create({ data: instanceData });
    }
  }

  const onboardingTemplateName = 'Mechanic Onboarding Template';
  let onboardingTemplate = await prisma.onboardingChecklist.findFirst({
    where: { name: onboardingTemplateName, employeeId: null },
  });

  if (!onboardingTemplate) {
    onboardingTemplate = await prisma.onboardingChecklist.create({
      data: {
        name: onboardingTemplateName,
        description: 'Default onboarding template for new workshop hires.',
        status: 'active',
        active: true,
      },
    });
  }

  const onboardingSteps = [
    { title: 'Uniform & PPE issue', ownerRole: 'HR_MANAGER', order: 1, sortOrder: 1, category: 'Admin', estimatedMinutes: 20 },
    { title: 'Workshop safety orientation', ownerRole: 'CHIEF_MECHANIC', order: 2, sortOrder: 2, category: 'Safety', estimatedMinutes: 45 },
    { title: 'Tool accountability briefing', ownerRole: 'CHIEF_MECHANIC', order: 3, sortOrder: 3, category: 'Operations', estimatedMinutes: 30 },
  ];

  for (const step of onboardingSteps) {
    const existingStep = await prisma.onboardingStep.findFirst({
      where: { checklistId: onboardingTemplate.id, sortOrder: step.sortOrder },
    });
    if (existingStep) {
      await prisma.onboardingStep.update({ where: { id: existingStep.id }, data: step });
    } else {
      await prisma.onboardingStep.create({ data: { checklistId: onboardingTemplate.id, ...step } });
    }
  }

  const reviewTemplateName = 'Monthly Performance Review';
  const existingReviewTemplate = await prisma.performanceReviewTemplate.findFirst({
    where: { name: reviewTemplateName },
  });

  if (existingReviewTemplate) {
    await prisma.performanceReviewTemplate.update({
      where: { id: existingReviewTemplate.id },
      data: { items: reviewTemplateItems, active: true },
    });
  } else {
    await prisma.performanceReviewTemplate.create({
      data: { name: reviewTemplateName, items: reviewTemplateItems, active: true },
    });
  }
}

async function seedAdminUser() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminRole = process.env.ADMIN_ROLE ?? 'ADMIN';

  if (!adminEmail || !adminPassword) {
    console.warn('Skipping PortalUser bootstrap because ADMIN_EMAIL or ADMIN_PASSWORD is not set.');
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await prisma.portalUser.upsert({
    where: { email: adminEmail },
    update: { passwordHash, role: adminRole, active: true },
    create: {
      email: adminEmail,
      passwordHash,
      role: adminRole,
      active: true,
    },
  });
}

async function main() {
  await seedDepartmentRecords();
  await seedRoleRecords();
  await seedPositionRecords();
  await seedEmployeeRecords();
  await seedDemoSchedulesAndTemplates();
  await seedAdminUser();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
