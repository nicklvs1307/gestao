const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPromotions() {
    try {
        const promotions = await prisma.promotion.findMany({
            include: { product: true }
        });

        console.log("Total Promotions Found:", promotions.length);
        
        const now = new Date();
        const startOfToday = new Date(now.setHours(0, 0, 0, 0));

        console.log("Current Date (Start of Today):", startOfToday.toISOString());

        promotions.forEach(p => {
            console.log("------------------------------------------------");
            console.log(`ID: ${p.id} | Name: ${p.name}`);
            console.log(`Start: ${p.startDate.toISOString()} | End: ${p.endDate.toISOString()}`);
            console.log(`IsActive: ${p.isActive}`);
            console.log(`Has Product: ${p.product ? 'YES (' + p.product.name + ')' : 'NO'}`);
            
            const startsOk = p.startDate <= new Date();
            const endsOk = p.endDate >= startOfToday;
            
            console.log(`Condition Starts (<= Now): ${startsOk}`);
            console.log(`Condition Ends (>= TodayStart): ${endsOk}`);
            console.log(`Will Show in API? ${p.isActive && startsOk && endsOk ? 'YES' : 'NO'}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkPromotions();