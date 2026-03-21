
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const restaurantId = 'cmm6nas6m0001k801znx8seh8';
    
    const session = await prisma.cashierSession.findFirst({
        where: { restaurantId, status: 'OPEN' }
    });

    if (!session) {
        console.log("No open session found.");
        return;
    }

    console.log("Open Session ID:", session.id);
    console.log("Opened At:", session.openedAt);

    const pendingDeliveries = await prisma.deliveryOrder.findMany({
        where: { 
            order: { 
                restaurantId, 
                isSettled: false,
                createdAt: { gte: session.openedAt }
            }, 
            status: 'DELIVERED' 
        },
        include: {
            order: true
        }
    });

    console.log(`Found ${pendingDeliveries.length} pending deliveries.`);
    
    pendingDeliveries.forEach(d => {
        console.log(`Order ID: ${d.orderId}, Status: ${d.status}, Driver ID: ${d.driverId}, Order Status: ${d.order.status}, Total: ${d.order.total}`);
    });

    await prisma.$disconnect();
}

check();
