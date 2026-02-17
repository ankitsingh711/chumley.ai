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

    // 2. Seed Hierarchy (Departments & Categories)
    console.log('Building Hierarchy from JSON...');
    const hierarchyData = require('./data/hierarchy.json');
    // Import hierarchy service - using dynamic import or relative path
    // Since we are in prisma/seed.ts, and hierarchyService is in src/services
    // We need to ensure we can import it.
    // However, seed.ts imports PrismaClient directly. hierarchyService uses prisma instance.
    // Let's copy the seeding logic or import the service.
    // Importing service is better but might have issues with path aliases if any.
    // Let's try importing. service uses '../config/db', which is relative to service file.

    // Actually, simpler to just include the logic here or import the service.
    // Let's try to import hierarchyService.
    const { hierarchyService } = require('../src/services/hierarchy.service');

    const stats = await hierarchyService.seedHierarchyData(hierarchyData);
    console.log('✅ Hierarchy Seeded:', stats);

    // 4. Create Users (Fetch depts first)
    // 4. Create Users (Fetch depts first)
    const allDepartments = await prisma.department.findMany();
    const hashedPassword = await bcrypt.hash('password123', 10);

    // System Admin
    await prisma.user.create({
        data: {
            email: 'admin@chumley.ai',
            password: hashedPassword,
            name: 'System Admin',
            role: UserRole.SYSTEM_ADMIN,
        }
    });
    console.log('👤 Created System Admin: admin@chumley.ai');

    // Create hierarchy users for each department
    for (const dept of allDepartments) {
        // Sanitize department name for email (e.g., "HR & Recruitment" -> "hr.recruitment")
        // Remove special chars, replace spaces with dots, lowercase
        const cleanName = dept.name.toLowerCase()
            .replace(/&/g, 'and')
            .replace(/[^a-z0-9]+/g, '.')
            .replace(/^\.+|\.+$/g, ''); // Trim dots

        // Senior Manager (Head of Department)
        const head = await prisma.user.create({
            data: {
                email: `head.${cleanName}@chumley.ai`,
                password: hashedPassword,
                name: `Head of ${dept.name}`,
                role: UserRole.SENIOR_MANAGER,
                departmentId: dept.id,
            }
        });

        // Manager (Reports to Head)
        const manager = await prisma.user.create({
            data: {
                email: `manager.${cleanName}@chumley.ai`,
                password: hashedPassword,
                name: `Manager ${dept.name}`,
                role: UserRole.MANAGER,
                departmentId: dept.id,
                managerId: head.id
            }
        });

        // Member (Reports to Manager)
        await prisma.user.create({
            data: {
                email: `member.${cleanName}@chumley.ai`,
                password: hashedPassword,
                name: `Member ${dept.name}`,
                role: UserRole.MEMBER,
                departmentId: dept.id,
                managerId: manager.id
            }
        });
    }

    console.log(`✅ Created Users for ${allDepartments.length} departments`);

    // Helper for suppliers below
    const itDept = allDepartments.find(d => d.name === 'Tech') || allDepartments[0];
    const hr = allDepartments.find(d => d.name === 'HR & Recruitment') || allDepartments[0];

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
            departments: itDept ? { connect: [{ id: itDept.id }] } : undefined
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
            departments: hr ? { connect: [{ id: hr.id }] } : undefined
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
