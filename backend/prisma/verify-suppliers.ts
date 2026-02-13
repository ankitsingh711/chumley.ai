import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Verifying Suppliers and Departments...');

    const suppliers = await prisma.supplier.findMany({
        include: {
            departments: true
        }
    });

    console.log(`Found ${suppliers.length} suppliers.`);
    for (const s of suppliers) {
        console.log(`- Supplier: ${s.name} (${s.status})`);
        if (s.departments.length > 0) {
            console.log(`  Linked Departments: ${s.departments.map(d => d.name).join(', ')}`);
        } else {
            console.log('  ⚠️ No linked departments (Global?)');
        }
    }

    const techUsers = await prisma.user.findMany({
        where: { department: { name: 'Tech' } },
        select: { email: true, role: true, department: { select: { name: true } } }
    });
    console.log('\nTech Users:', techUsers);
}

main()
    .finally(async () => {
        await prisma.$disconnect();
    });
