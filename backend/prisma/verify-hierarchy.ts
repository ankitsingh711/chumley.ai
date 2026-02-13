import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Verifying Hierarchy...');

    const departments = await prisma.department.findMany();
    console.log('Departments:', departments.map(d => d.name).join(', '));

    const tech = await prisma.department.findUnique({
        where: { name: 'Tech' },
        include: {
            categories: {
                where: { parentId: null },
                include: {
                    children: {
                        include: {
                            children: true
                        }
                    }
                }
            }
        }
    });

    if (tech) {
        console.log('\nTech Department Hierarchy (Top Level):');
        for (const cat of tech.categories) {
            console.log(`- ${cat.name} (${cat.branch})`);
            for (const child of cat.children) {
                console.log(`  - ${child.name}`);
                for (const grandChild of child.children) {
                    console.log(`    - ${grandChild.name}`);
                }
            }
        }
    } else {
        console.log('❌ Tech department not found');
    }
}

main()
    .finally(async () => {
        await prisma.$disconnect();
    });
