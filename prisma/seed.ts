// prisma/seed.ts

const { PrismaClient } = require('@prisma/client');
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding...');

  const adminHash = await bcrypt.hash('Admin123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@docuchat.dev' },
    update: {},
    create: {
      email: 'admin@docuchat.dev',
      passwordHash: adminHash,
      tier: 'enterprise',
      tokenLimit: 1000000,
    },
  });

  const userHash = await bcrypt.hash('Test1234!', 12);
  const user = await prisma.user.upsert({
    where: { email: 'test@docuchat.dev' },
    update: {},
    create: {
      email: 'test@docuchat.dev',
      passwordHash: userHash,
    },
  });

  // Seed RBAC (roles & permissions) and assign roles to seeded users
  await seedRBAC();

  const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
  const memberRole = await prisma.role.findUnique({ where: { name: 'member' } });

  if (adminRole) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: { userId: admin.id, roleId: adminRole.id },
      },
      update: {},
      create: {
        userId: admin.id,
        roleId: adminRole.id,
        assignedBy: 'seed',
      },
    });
  }

  if (memberRole) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: { userId: user.id, roleId: memberRole.id },
      },
      update: {},
      create: {
        userId: user.id,
        roleId: memberRole.id,
        assignedBy: 'seed',
      },
    });
  }

  await prisma.document.create({
    data: {
      userId: user.id,
      title: 'Getting Started with DocuChat',
      filename: 'getting-started.txt',
      content: 'Welcome to DocuChat. This is a sample document.',
      status: 'ready',
      chunkCount: 1,
    },
  });

  console.log('Done. admin:', admin.email, 'user:', user.email);
}


async function seedRBAC() {
  // Define permissions
  const permissionDefs = [
    { name: 'documents:create', resource: 'documents', action: 'create',
      description: 'Upload documents' },
    { name: 'documents:read', resource: 'documents', action: 'read',
      description: 'View documents' },
    { name: 'documents:update', resource: 'documents', action: 'update',
      description: 'Edit document metadata' },
    { name: 'documents:delete', resource: 'documents', action: 'delete',
      description: 'Delete documents' },
    { name: 'conversations:create', resource: 'conversations', action: 'create',
      description: 'Start conversations' },
    { name: 'conversations:read', resource: 'conversations', action: 'read',
      description: 'View conversations' },
    { name: 'users:read', resource: 'users', action: 'read',
      description: 'View user list' },
    { name: 'users:manage', resource: 'users', action: 'manage',
      description: 'Manage user accounts' },
    { name: 'roles:manage', resource: 'roles', action: 'manage',
      description: 'Manage roles and permissions' },
  ];

  // Upsert all permissions
  const permissions: Record<string, any> = {};
  for (const perm of permissionDefs) {
    permissions[perm.name] = await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm,
    });
  }

  // Define roles with their permissions
  const roleDefs = [
    {
      name: 'admin',
      description: 'Full system access',
      permissions: Object.keys(permissions), // All permissions
    },
    {
      name: 'member',
      description: 'Standard user',
      isDefault: true,
      permissions: [
        'documents:create', 'documents:read', 'documents:update',
        'conversations:create', 'conversations:read',
      ],
    },
    {
      name: 'viewer',
      description: 'Read-only access',
      permissions: ['documents:read', 'conversations:read'],
    },
  ];

  for (const roleDef of roleDefs) {
    const role = await prisma.role.upsert({
      where: { name: roleDef.name },
      update: {},
      create: {
        name: roleDef.name,
        description: roleDef.description,
        isDefault: roleDef.isDefault ?? false,
      },
    });

    // Link permissions to role
    for (const permName of roleDef.permissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permissions[permName].id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permissions[permName].id,
        },
      });
    }
  }

  console.log('RBAC seeded: 3 roles, 9 permissions');
}


main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

