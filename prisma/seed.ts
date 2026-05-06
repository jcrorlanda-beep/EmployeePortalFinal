import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const seedDepartments = [
  { name: 'Service Desk', managerName: 'Unassigned', notes: 'Default service department seed.', active: true },
  { name: 'Workshop', managerName: 'Unassigned', notes: 'Default workshop department seed.', active: true },
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
];

async function main() {
  for (const department of seedDepartments) {
    const existingDepartment = await prisma.department.findFirst({ where: { name: department.name } });
    if (existingDepartment) {
      await prisma.department.update({ where: { id: existingDepartment.id }, data: department });
    } else {
      await prisma.department.create({ data: department });
    }
  }

  for (const role of seedRoles) {
    const existingRole = await prisma.employeeRole.findFirst({ where: { name: role.name } });
    if (existingRole) {
      await prisma.employeeRole.update({ where: { id: existingRole.id }, data: role });
    } else {
      await prisma.employeeRole.create({ data: role });
    }
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminRole = process.env.ADMIN_ROLE ?? 'ADMIN';

  if (adminEmail && adminPassword) {
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
  } else {
    console.warn('Skipping PortalUser bootstrap because ADMIN_EMAIL or ADMIN_PASSWORD is not set.');
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
