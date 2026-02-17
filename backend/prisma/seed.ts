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
    const hr = await prisma.department.findFirst({ where: { name: 'HR & Recruitment' } }); // Updated name from JSON
    const fleet = await prisma.department.findFirst({ where: { name: 'Fleet' } });
    const marketing = await prisma.department.findFirst({ where: { name: 'Marketing' } });
    const tech = await prisma.department.findFirst({ where: { name: 'Tech' } }); // Top level? JSON has Tech under Chessington/Royston.
    // Wait, the JSON structure has Branches at top level: Chessington, Royston.
    // department names are keys under "Staff Cost" or seemingly the keys under Branch.
    // Looking at JSON: Chessington -> Tech -> ...
    // The keys under Branch seem to be "Tech", "Sector Group", "Trade Group", "Support", "Fleet", "Assets", etc.
    // These look like Categories or Departments?
    // In seedHierarchyData:
    // for (const [departmentName, departmentData] of Object.entries(branchData))
    // It treats the keys under branch as Departments.
    // So "Tech", "Sector Group", "Trade Group" are Departments.

    // Let's fetch them
    const itDept = await prisma.department.findFirst({ where: { name: 'Tech' } }); // "Tech" is a department in JSON

    if (!hr || !fleet || !marketing || !itDept) {
        console.warn('⚠️ Some departments not found for user assignment. Using available ones or skipping.');
    }

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
    if (itDept) {
        const seniorManager = await prisma.user.create({
            data: {
                email: 'senior@chumley.ai',
                password: hashedPassword,
                name: 'Sarah Director',
                role: UserRole.SENIOR_MANAGER,
                departmentId: itDept.id, // Head of Tech
            }
        });

        // Manager (e.g. IT Manager) - Reports to Senior Manager
        const manager = await prisma.user.create({
            data: {
                email: 'manager@chumley.ai',
                password: hashedPassword,
                name: 'Mike Operations',
                role: UserRole.MANAGER,
                departmentId: itDept.id,
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
                departmentId: itDept.id,
                managerId: manager.id
            }
        });
    }

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
