const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRestaurant() {
    try {
        const restaurants = await prisma.restaurant.findMany();
        console.log("Restaurantes:", restaurants);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
checkRestaurant();