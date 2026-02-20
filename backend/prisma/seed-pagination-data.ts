import { PrismaClient, RequestStatus, OrderStatus, Branch } from '@prisma/client';

const prisma = new PrismaClient();

const descriptions = [
    'Laptop chargers', 'Wireless keyboards', 'Monitor stands', 'USB-C hubs',
    'Ergonomic chairs', 'Standing desks', 'Webcam HD Pro', 'Noise-cancelling headset',
    'Printer toner cartridges', 'A4 paper bulk pack', 'Whiteboard markers set',
    'Desk organiser trays', 'Project folders pack', 'Ethernet cables (Cat6)',
    'Wireless mouse', 'Screen protectors', 'Cable management kit', 'Sticky notes bulk',
    'Fire extinguisher refill', 'First aid supplies', 'Hand sanitiser bulk',
    'Cleaning supplies', 'Coffee beans premium', 'Water dispenser filters',
    'Visitor ID badge printer ribbon', 'Presentation clicker', 'HDMI cables pack',
    'External SSD 1TB', 'Portable projector', 'Conference phone speaker',
    'Desk lamps LED', 'Bookshelf unit', 'Filing cabinet 3-drawer',
    'Shredder machine', 'Label maker tape refills', 'Envelopes windowed pack',
    'Rubber bands assorted', 'Binder clips large', 'Correction tape multi-pack',
    'Staff uniforms batch', 'Safety goggles pack', 'High-vis jackets',
    'Hardhat replacements', 'Anti-fatigue mats', 'Tool kit professional',
    'Drill bit set', 'Measuring tape set', 'Paint supplies', 'Padlocks keyed alike',
    'Signage outdoor rated'
];

const reasons = [
    'Needed for new team members onboarding',
    'Replacement for broken/worn-out items',
    'Quarterly office supply replenishment',
    'Required for upcoming client presentation',
    'Safety compliance requirement',
    'IT infrastructure upgrade',
    'Team expansion - additional equipment needed',
    'Annual maintenance and restocking',
    'Urgent project requirement',
    'General office improvement',
];

function randomDate(daysBack: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - Math.floor(Math.random() * daysBack));
    d.setHours(Math.floor(Math.random() * 14) + 7); // 7am-9pm
    d.setMinutes(Math.floor(Math.random() * 60));
    return d;
}

function randomAmount(): number {
    // Between 50 and 5000
    return Math.round((50 + Math.random() * 4950) * 100) / 100;
}

async function main() {
    console.log('🌱 Seeding 50 Purchase Requests + 50 Purchase Orders...\n');

    // Get existing users and suppliers
    const users = await prisma.user.findMany({ select: { id: true, name: true, role: true } });
    const suppliers = await prisma.supplier.findMany({ select: { id: true, name: true } });

    if (users.length === 0) {
        console.error('❌ No users found! Run the main seed first: npx prisma db seed');
        process.exit(1);
    }
    if (suppliers.length === 0) {
        console.error('❌ No suppliers found! Run the main seed first: npx prisma db seed');
        process.exit(1);
    }

    console.log(`  Found ${users.length} users, ${suppliers.length} suppliers`);

    const requestStatuses = [
        RequestStatus.APPROVED, RequestStatus.APPROVED, RequestStatus.APPROVED,
        RequestStatus.PENDING, RequestStatus.REJECTED, RequestStatus.IN_PROGRESS,
    ];
    const orderStatuses = [
        OrderStatus.IN_PROGRESS, OrderStatus.SENT, OrderStatus.COMPLETED,
        OrderStatus.COMPLETED, OrderStatus.SENT,
    ];
    const branches = [Branch.CHESSINGTON, Branch.ROYSTON];

    const createdRequests: { id: string; supplierId: string; totalAmount: any; status: RequestStatus }[] = [];

    // Create 50 Purchase Requests
    for (let i = 0; i < 50; i++) {
        const requester = users[Math.floor(Math.random() * users.length)];
        const supplier = suppliers[Math.floor(Math.random() * suppliers.length)];
        const status = requestStatuses[Math.floor(Math.random() * requestStatuses.length)];
        const totalAmount = randomAmount();
        const createdAt = randomDate(90);
        const desc = descriptions[i % descriptions.length];
        const reason = reasons[Math.floor(Math.random() * reasons.length)];
        const quantity = Math.floor(Math.random() * 20) + 1;
        const unitPrice = Math.round((totalAmount / quantity) * 100) / 100;

        const request = await prisma.purchaseRequest.create({
            data: {
                requesterId: requester.id,
                supplierId: supplier.id,
                status,
                totalAmount,
                reason,
                branch: branches[Math.floor(Math.random() * branches.length)],
                createdAt,
                updatedAt: createdAt,
                items: {
                    create: [
                        {
                            description: desc,
                            quantity,
                            unitPrice,
                            totalPrice: totalAmount,
                        }
                    ]
                }
            }
        });

        createdRequests.push({ id: request.id, supplierId: supplier.id, totalAmount: request.totalAmount, status });

        if ((i + 1) % 10 === 0) console.log(`  ✅ Created ${i + 1}/50 requests`);
    }

    // Create 50 Purchase Orders from APPROVED requests (and some additional)
    // Use as many approved requests as we can, then create extra approved requests to fill to 50
    const approvedRequests = createdRequests.filter(r => r.status === RequestStatus.APPROVED);

    // If we don't have 50 approved, create more approved requests
    let additionalNeeded = 50 - approvedRequests.length;
    for (let i = 0; i < additionalNeeded; i++) {
        const requester = users[Math.floor(Math.random() * users.length)];
        const supplier = suppliers[Math.floor(Math.random() * suppliers.length)];
        const totalAmount = randomAmount();
        const createdAt = randomDate(90);
        const desc = descriptions[Math.floor(Math.random() * descriptions.length)];
        const quantity = Math.floor(Math.random() * 20) + 1;
        const unitPrice = Math.round((totalAmount / quantity) * 100) / 100;

        const request = await prisma.purchaseRequest.create({
            data: {
                requesterId: requester.id,
                supplierId: supplier.id,
                status: RequestStatus.APPROVED,
                totalAmount,
                reason: reasons[Math.floor(Math.random() * reasons.length)],
                branch: branches[Math.floor(Math.random() * branches.length)],
                createdAt,
                updatedAt: createdAt,
                items: {
                    create: [{
                        description: desc,
                        quantity,
                        unitPrice,
                        totalPrice: totalAmount,
                    }]
                }
            }
        });

        approvedRequests.push({ id: request.id, supplierId: supplier.id, totalAmount: request.totalAmount, status: RequestStatus.APPROVED });
    }

    console.log(`  📋 Total approved requests available for orders: ${approvedRequests.length}`);

    // Create Purchase Orders from approved requests
    for (let i = 0; i < 50; i++) {
        const req = approvedRequests[i];
        const status = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
        const createdAt = randomDate(60);

        await prisma.purchaseOrder.create({
            data: {
                requestId: req.id,
                supplierId: req.supplierId,
                status,
                totalAmount: req.totalAmount,
                issuedAt: status !== OrderStatus.IN_PROGRESS ? createdAt : null,
                createdAt,
                updatedAt: createdAt,
            }
        });

        if ((i + 1) % 10 === 0) console.log(`  ✅ Created ${i + 1}/50 orders`);
    }

    const totalRequests = await prisma.purchaseRequest.count();
    const totalOrders = await prisma.purchaseOrder.count();

    console.log(`\n🎉 Done! Database now has ${totalRequests} requests and ${totalOrders} orders.\n`);
}

main()
    .catch((e) => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
