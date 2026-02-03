const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const restaurant = await prisma.restaurant.findFirst();
    if (!restaurant) {
      console.log('Nenhum restaurante encontrado.');
      return;
    }
    console.log(`Atualizando restaurante: ${restaurant.name} (${restaurant.id})`);
    
    await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: { logoUrl: '/uploads/logo.png' },
    });
    
    console.log('Logo URL atualizada com sucesso para: /uploads/logo.png');
    
  } catch (e) {
    console.error('Erro ao atualizar logo:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
