import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Verifying categories...');
    const totalCategories = await prisma.spendingCategory.count();
    console.log(`Total Categories: ${totalCategories}`);

    const departments = await prisma.department.findMany({
        include: {
            _count: {
                select: { categories: true }
            }
        }
    });

    for (const dept of departments) {
        const count = await prisma.spendingCategory.count({ where: { departmentId: dept.id } });
        console.log(`Department: ${dept.name} (${count} categories)`);
    }

    // Verify a random deep node
    const deepNode = await prisma.spendingCategory.findFirst({
        where: { name: 'Acoustic leak detectors' },
        include: { parent: { include: { parent: true } } }
    });

    if (deepNode) {
        console.log('Sample deep node found:', deepNode.name);
        console.log('Path:', deepNode.parent?.parent?.name, '->', deepNode.parent?.name, '->', deepNode.name);
    } else {
        console.warn('Sample deep node "Acoustic leak detectors" NOT FOUND.');
    }
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
