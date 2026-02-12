import { PrismaClient, UserRole, RequestStatus, OrderStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // 1. Clean up
    // 1. Clean up
    await prisma.contract.deleteMany();
    await prisma.review.deleteMany();
    await prisma.message.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.userDepartmentRole.deleteMany();

    await prisma.supplierDocument.deleteMany();
    await prisma.supplierDetails.deleteMany();
    await prisma.purchaseOrder.deleteMany();
    await prisma.requestItem.deleteMany();
    await prisma.approvalHistory.deleteMany();
    await prisma.attachment.deleteMany();
    await prisma.purchaseRequest.deleteMany();
    await prisma.interactionLog.deleteMany();

    // Handle Spending Categories (self-referencing)
    await prisma.spendingCategory.updateMany({ data: { parentId: null } });
    await prisma.spendingCategory.deleteMany();

    await prisma.supplier.deleteMany();

    // Nullify managerId to avoid self-referencing FK constraint
    await prisma.user.updateMany({ data: { managerId: null } });
    await prisma.user.deleteMany();

    // Nullify parentId to avoid self-referencing FK constraint
    await prisma.department.updateMany({ data: { parentId: null } });
    await prisma.department.deleteMany();

    // 2. Create Departments
    console.log('Building Department Hierarchy...');

    // Parent Departments
    const hr = await prisma.department.create({ data: { name: 'HR & Equipment', budget: 50000 } });
    const fleet = await prisma.department.create({ data: { name: 'Fleet', budget: 100000 } });
    const marketing = await prisma.department.create({ data: { name: 'Marketing', budget: 75000 } });
    const sales = await prisma.department.create({ data: { name: 'Sales', budget: 50000 } });
    const finance = await prisma.department.create({ data: { name: 'Finance', budget: 150000 } });
    const trade = await prisma.department.create({ data: { name: 'Trade Group', budget: 200000 } });
    const assets = await prisma.department.create({ data: { name: 'Assets', budget: 300000 } });
    const tech = await prisma.department.create({ data: { name: 'Tech', budget: 250000 } });

    // Sub-Departments
    const it = await prisma.department.create({
        data: {
            name: 'IT',
            budget: 120000,
            parentId: tech.id // IT under Tech
        }
    });

    console.log('✅ Created Departments');

    // 3. Create Spending Categories (Dynamic)
    const createCategory = async (name: string, deptId: string) => {
        await prisma.spendingCategory.create({
            data: { name, departmentId: deptId, branch: 'CHESSINGTON' } // Branch enum still needed?
        });
    };

    // Assets Categories
    await createCategory('Aspect Run', assets.id);
    await createCategory('Custom', assets.id);
    await createCategory('Heavy Machinery', assets.id);

    // IT Categories
    await createCategory('Hardware', it.id);
    await createCategory('Software Licenses', it.id);
    await createCategory('Cloud Services', it.id);

    // Marketing Categories
    await createCategory('Digital Ads', marketing.id);
    await createCategory('Print Materials', marketing.id);

    // 4. Create Users
    const hashedPassword = await bcrypt.hash('password123', 10);

    // System Admin
    const admin = await prisma.user.create({
        data: {
            email: 'admin@chumley.ai',
            password: hashedPassword,
            name: 'System Admin', // Permissions: Full access
            role: UserRole.SYSTEM_ADMIN,
        }
    });

    // Senior Manager (e.g. Head of Tech)
    const seniorManager = await prisma.user.create({
        data: {
            email: 'senior@chumley.ai',
            password: hashedPassword,
            name: 'Sarah Director',
            role: UserRole.SENIOR_MANAGER,
            departmentId: tech.id, // Head of Tech
        }
    });

    // Manager (e.g. IT Manager) - Reports to Senior Manager
    const manager = await prisma.user.create({
        data: {
            email: 'manager@chumley.ai',
            password: hashedPassword,
            name: 'Mike Operations',
            role: UserRole.MANAGER,
            departmentId: it.id,
            managerId: seniorManager.id
        }
    });

    // Department User (e.g. IT Support) - Reports to Manager
    const user = await prisma.user.create({
        data: {
            email: 'user@chumley.ai',
            password: hashedPassword,
            name: 'John Doe',
            role: UserRole.MEMBER,
            departmentId: it.id,
            managerId: manager.id
        }
    });

    console.log('✅ Created Users');

    // 5. Create Suppliers
    const suppliers = [
        {
            name: 'TechCorp Solutions',
            category: 'Electronics',
            status: 'Preferred',
            contactName: 'Jane Smith',
            contactEmail: 'jane@techcorp.com',
            details: {
                phone: '+1 (512) 555-0123',
                address: '123 Tech Blvd',
                city: 'Austin',
                state: 'TX',
                zipCode: '78701',
                country: 'USA',
                paymentTerms: 'Net 30',
                rating: 4.8,
            },
            // Link to IT and Tech departments
            departments: {
                connect: [{ id: it.id }, { id: tech.id }]
            }
        },
        {
            name: 'Office Depot Inc.',
            category: 'Office Supplies',
            status: 'Active',
            contactName: 'Support Team',
            contactEmail: 'b2b@officedepot.com',
            details: {
                paymentTerms: 'Net 45',
                rating: 4.2,
            },
            // Link to Admin/HR
            departments: {
                connect: [{ id: hr.id }]
            }
        }
    ];

    for (const s of suppliers) {
        const { details, departments, ...base } = s;
        await prisma.supplier.create({
            data: {
                ...base,
                details: { create: details },
                departments: departments
            }
        });
    }

    console.log('✅ Seeding complete');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
