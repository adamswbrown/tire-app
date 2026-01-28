import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('consultant123', 10);
  const adminPassword = await bcrypt.hash('admin123', 10);

  await prisma.user.upsert({
    where: { email: 'consultant@test.com' },
    update: {},
    create: {
      email: 'consultant@test.com',
      name: 'Consultant User',
      password,
      role: 'Consultant',
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      email: 'admin@test.com',
      name: 'Admin User',
      password: adminPassword,
      role: 'Admin',
    },
  });

  console.log('Seeded test users.');
}

main().finally(() => prisma.$disconnect());
