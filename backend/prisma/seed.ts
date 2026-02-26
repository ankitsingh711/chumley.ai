import { PrismaClient, UserRole, RequestStatus, OrderStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

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
    const { fullHierarchy: hierarchyData } = require('../src/scripts/seedCategories');
    const { hierarchyService } = require('../src/services/hierarchy.service');

    const stats = await hierarchyService.seedHierarchyData(hierarchyData);
    console.log('✅ Hierarchy Seeded:', stats);

    // 4. Create Users (Fetch depts first)
    const allDepartments = await prisma.department.findMany();
    const hashedPassword = await bcrypt.hash('password123', 10);

    // System Admin
    const adminUser = await prisma.user.create({
        data: {
            email: 'admin@chumley.ai',
            password: hashedPassword,
            name: 'System Admin',
            role: UserRole.SYSTEM_ADMIN,
        }
    });
    console.log('👤 Created System Admin: admin@chumley.ai');

    const members: any[] = [];

    // Create hierarchy users for each department
    for (const dept of allDepartments) {
        // Sanitize department name for email
        const cleanName = dept.name.toLowerCase()
            .replace(/&/g, 'and')
            .replace(/[^a-z0-9]+/g, '.')
            .replace(/^\.+|\.+$/g, '');

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
        const member = await prisma.user.create({
            data: {
                email: `member.${cleanName}@chumley.ai`,
                password: hashedPassword,
                name: `Member ${dept.name}`,
                role: UserRole.MEMBER,
                departmentId: dept.id,
                managerId: manager.id
            }
        });

        members.push(member);
    }

    console.log(`✅ Created ${allDepartments.length * 3} Users for ${allDepartments.length} departments`);

    // Helper for suppliers below
    const itDept = allDepartments.find(d => d.name === 'Tech') || allDepartments[0];
    const hr = allDepartments.find(d => d.name === 'HR & Recruitment') || allDepartments[0];
    const marketing = allDepartments.find(d => d.name === 'Marketing') || allDepartments[0];
    const finance = allDepartments.find(d => d.name === 'Finance') || allDepartments[0];
    const fleet = allDepartments.find(d => d.name === 'Fleet') || allDepartments[0];
    const support = allDepartments.find(d => d.name === 'Support') || allDepartments[0];

    // 5. Create Suppliers With Strict Email Domains
    const suppliers = [
        { name: 'TechCorp Solutions', category: 'Software', status: 'Preferred', contactName: 'Jane Smith', contactEmail: 'jane.smith@chumley.ai', details: { phone: '+1 (512) 555-0123', address: '123 Tech Blvd', city: 'Austin', state: 'TX', zipCode: '78701', country: 'USA', paymentTerms: 'Net 30', rating: 4.8 }, departments: { connect: [{ id: itDept.id }] } },
        { name: 'Office Depot Inc.', category: 'Office Supplies', status: 'Active', contactName: 'Support Team', contactEmail: 'b2b.support@chumley.ai', details: { paymentTerms: 'Net 45', rating: 4.2 }, departments: { connect: [{ id: hr.id }] } },
        { name: 'CloudFlare Hosting', category: 'IT', status: 'Preferred', contactName: 'Net Ops', contactEmail: 'hosting@chumley.ai', details: { paymentTerms: 'Net 30', rating: 4.9 }, departments: { connect: [{ id: itDept.id }] } },
        { name: 'Logistics Pro', category: 'Fleet', status: 'Review Pending', contactName: 'Mark Vance', contactEmail: 'mark.vance@chumley.ai', details: { paymentTerms: 'Net 60', rating: 3.5 }, departments: { connect: [{ id: fleet.id }] } },
        { name: 'Marketing Masters', category: 'Marketing', status: 'Active', contactName: 'Sarah Jenkins', contactEmail: 'sarah.j@chumley.ai', details: { paymentTerms: 'Net 30', rating: 4.5 }, departments: { connect: [{ id: marketing.id }] } },
        { name: 'PrintWorks Co.', category: 'Marketing', status: 'Preferred', contactName: 'Print Team', contactEmail: 'hello@chumley.ai', details: { paymentTerms: 'Net 30', rating: 4.7 }, departments: { connect: [{ id: marketing.id }] } },
        { name: 'Recruiters United', category: 'HR', status: 'Active', contactName: 'Talent Acq', contactEmail: 'talent@chumley.ai', details: { paymentTerms: 'Net 30', rating: 4.0 }, departments: { connect: [{ id: hr.id }] } },
        { name: 'Enterprise Analytics', category: 'IT', status: 'Active', contactName: 'Data Team', contactEmail: 'data.ops@chumley.ai', details: { paymentTerms: 'Net 60', rating: 4.1 }, departments: { connect: [{ id: itDept.id }] } },
        { name: 'SecureShield Insurance', category: 'Finance', status: 'Preferred', contactName: 'Risk Mgmt', contactEmail: 'insurance@chumley.ai', details: { paymentTerms: 'Net 30', rating: 4.6 }, departments: { connect: [{ id: finance.id }] } },
        { name: 'AutoFleet Services', category: 'Fleet', status: 'Active', contactName: 'Fleet Ops', contactEmail: 'autofleet@chumley.ai', details: { paymentTerms: 'Net 90', rating: 3.9 }, departments: { connect: [{ id: fleet.id }] } },
        { name: 'Legal Counsel Group', category: 'Support', status: 'Review Pending', contactName: 'Legal Counsel', contactEmail: 'legal@chumley.ai', details: { paymentTerms: 'Net 30', rating: 4.8 }, departments: { connect: [{ id: support.id }] } },
        { name: 'Global Consultants', category: 'Sector Group', status: 'Active', contactName: 'Advisors', contactEmail: 'advise@chumley.ai', details: { paymentTerms: 'Net 60', rating: 4.4 }, departments: { connect: [{ id: itDept.id }, { id: finance.id }] } },
        { name: 'NextGen AI', category: 'Tech', status: 'Preferred', contactName: 'AI R&D', contactEmail: 'ai.dev@chumley.ai', details: { paymentTerms: 'Net 30', rating: 4.9 }, departments: { connect: [{ id: itDept.id }] } },
        { name: 'FastTrack Shipping', category: 'Fleet', status: 'Active', contactName: 'Logistics Support', contactEmail: 'shipping@chumley.ai', details: { paymentTerms: 'Net 30', rating: 4.3 }, departments: { connect: [{ id: fleet.id }] } },
        { name: 'Event Planners Inc', category: 'Marketing', status: 'Active', contactName: 'Events Team', contactEmail: 'events@chumley.ai', details: { paymentTerms: 'Net 45', rating: 4.1 }, departments: { connect: [{ id: marketing.id }, { id: hr.id }] } },
    ];

    const createdSuppliers: any[] = [];
    for (const s of suppliers) {
        const { details, departments, ...base } = s;
        const sup = await prisma.supplier.create({
            data: {
                ...base,
                details: { create: details },
                departments: departments
            }
        });
        createdSuppliers.push(sup);
    }
    console.log(`✅ Created ${createdSuppliers.length} Suppliers`);

    // 6. Create Purchase Requests and Orders
    const statuses = ['PENDING', 'APPROVED', 'REJECTED'];
    let requestsCount = 0;
    let ordersCount = 0;

    for (let i = 0; i < 20; i++) {
        const randomMember = members[Math.floor(Math.random() * members.length)];
        const randomSupplier = createdSuppliers[Math.floor(Math.random() * createdSuppliers.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)] as any;
        const totalAmount = Math.floor(Math.random() * 5000) + 500;

        const request = await prisma.purchaseRequest.create({
            data: {
                reason: `Need to purchase ${randomSupplier.category} supplies from ${randomSupplier.name}`,
                status: status,
                budgetCategory: randomMember.departmentId ? allDepartments.find(d => d.id === randomMember.departmentId)?.name : 'General / Uncategorized',
                totalAmount: totalAmount,
                supplierId: randomSupplier.id,
                requesterId: randomMember.id,
                items: {
                    create: [
                        {
                            description: `Item 1 from ${randomSupplier.name}`,
                            quantity: Math.floor(Math.random() * 10) + 1,
                            unitPrice: Math.floor(totalAmount / 2),
                            totalPrice: totalAmount,
                        }
                    ]
                }
            }
        });
        requestsCount++;

        if (status === 'APPROVED') {
            await prisma.purchaseOrder.create({
                data: {
                    requestId: request.id,
                    supplierId: randomSupplier.id,
                    status: 'SENT',
                    totalAmount: totalAmount,
                    issuedAt: new Date(),
                }
            });
            ordersCount++;

            // Log PO creation interaction
            await prisma.interactionLog.create({
                data: {
                    supplierId: randomSupplier.id,
                    userId: adminUser.id,   // Simulate the admin approving/creating it
                    eventType: 'order_created',
                    title: 'Purchase Order Issued',
                    description: `Order issued for Request #${request.id.slice(0, 8)}. Amount: £${Number(totalAmount).toLocaleString()}`,
                    eventDate: new Date(),
                }
            });
        }
    }
    console.log(`✅ Created ${requestsCount} Purchase Requests and ${ordersCount} Purchase Orders`);
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
