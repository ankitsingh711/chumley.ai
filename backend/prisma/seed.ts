import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create test user
    const hashedPassword = await bcrypt.hash('password123', 10);

    const user = await prisma.user.upsert({
        where: { email: 'test@chumley.ai' },
        update: {},
        create: {
            email: 'test@chumley.ai',
            password: hashedPassword,
            name: 'Test User',
            department: 'IT',
        },
    });

    console.log('✅ Created user:', user.email);
    console.log('📧 Email: test@chumley.ai');
    console.log('🔑 Password: password123');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
