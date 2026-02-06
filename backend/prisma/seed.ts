import { PrismaClient, UserRole, RequestStatus, OrderStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // 1. Clean up
    await prisma.supplierDocument.deleteMany();
    await prisma.supplierDetails.deleteMany();
    await prisma.purchaseOrder.deleteMany();
    await prisma.requestItem.deleteMany();
    await prisma.approvalHistory.deleteMany();
    await prisma.attachment.deleteMany();
    await prisma.purchaseRequest.deleteMany();
    await prisma.interactionLog.deleteMany();
    await prisma.supplier.deleteMany();
    await prisma.user.deleteMany();
    await prisma.department.deleteMany();

    // 2. Create Departments
    const itDept = await prisma.department.create({
        data: { name: 'IT', budget: 50000, description: 'Information Technology' }
    });
    const marketingDept = await prisma.department.create({
        data: { name: 'Marketing', budget: 30000, description: 'Marketing & Brand' }
    });

    // 3. Create Users
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Admin
    const admin = await prisma.user.create({
        data: {
            email: 'admin@chumley.ai',
            password: hashedPassword,
            name: 'System Admin',
            role: UserRole.SYSTEM_ADMIN,
        }
    });

    // Manager
    const manager = await prisma.user.create({
        data: {
            email: 'manager@chumley.ai',
            password: hashedPassword,
            name: 'Mike Operations',
            role: UserRole.MANAGER,
            departmentId: itDept.id,
        }
    });

    console.log('✅ Created users');

    // 4. Create Suppliers
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
                deliveryDelayAverage: -2, // 2 days early
                qualityScore: 98,
                communicationScore: 85,
                internalNotes: 'Reliable for bulk orders, but historically slow with custom motherboard quotes.',
            },
            documents: [
                { title: 'W-9 Tax Form (2023)', type: 'Tax', url: '#', status: 'Valid', expiryDate: null },
                { title: 'Liability Insurance', type: 'Insurance', url: '#', status: 'Expiring Soon', expiryDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000) }, // 12 days
                { title: 'ISO 27001 Cert', type: 'Certification', url: '#', status: 'Valid', expiryDate: new Date('2025-12-31') },
            ]
        },
        {
            name: 'Office Depot Inc.',
            category: 'Office Supplies',
            status: 'Active',
            contactName: 'Support Team',
            contactEmail: 'b2b@officedepot.com',
            details: {
                city: 'Boca Raton',
                state: 'FL',
                paymentTerms: 'Net 45',
                rating: 4.2,
                deliveryDelayAverage: 1, // 1 day late
                qualityScore: 92,
                communicationScore: 90,
            },
            documents: [
                { title: 'W-9 Tax Form', type: 'Tax', url: '#', status: 'Valid', expiryDate: null },
            ]
        }
    ];

    for (const s of suppliers) {
        const { details, documents, ...base } = s;
        const supplier = await prisma.supplier.create({
            data: {
                ...base,
                details: { create: details },
                documents: { create: documents }
            }
        });

        // Add some interaction logs
        await prisma.interactionLog.create({
            data: {
                supplierId: supplier.id,
                userId: manager.id,
                eventType: 'meeting',
                title: 'Quarterly Review',
                description: 'discussed pricing updates for Q3.',
                eventDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 1 week ago
            }
        });

        // Add some Purchase Requests & Orders
        if (s.name === 'TechCorp Solutions') {
            const req = await prisma.purchaseRequest.create({
                data: {
                    requesterId: manager.id,
                    supplierId: supplier.id,
                    status: RequestStatus.APPROVED,
                    totalAmount: 2499.99,
                    reason: 'New workstations',
                    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
                    items: {
                        create: [
                            { description: 'Dell Precision 5000', quantity: 1, unitPrice: 2499.99, totalPrice: 2499.99 }
                        ]
                    }
                }
            });

            // Create Order for it
            await prisma.purchaseOrder.create({
                data: {
                    requestId: req.id,
                    supplierId: supplier.id,
                    status: OrderStatus.SENT,
                    totalAmount: 2499.99
                }
            });
        }
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
