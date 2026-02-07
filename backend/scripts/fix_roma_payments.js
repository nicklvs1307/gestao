const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  const restaurant = await prisma.restaurant.findFirst({
    where: { slug: 'roma' }
  });

  if (!restaurant) {
    console.log('Restaurante roma não encontrado.');
    return;
  }

  const count = await prisma.paymentMethod.count({ where: { restaurantId: restaurant.id } });
  
  if (count === 0) {
    console.log('Criando formas padrão para o Roma...');
    const defaults = [
      { name: 'Dinheiro', type: 'CASH', allowDelivery: true, allowPos: true, allowTable: true, restaurantId: restaurant.id },
      { name: 'Pix', type: 'PIX', allowDelivery: true, allowPos: true, allowTable: true, restaurantId: restaurant.id },
      { name: 'Cartão de Crédito', type: 'CREDIT_CARD', allowDelivery: true, allowPos: true, allowTable: true, restaurantId: restaurant.id },
      { name: 'Cartão de Débito', type: 'DEBIT_CARD', allowDelivery: true, allowPos: true, allowTable: true, restaurantId: restaurant.id },
    ];
    await prisma.paymentMethod.createMany({ data: defaults });
  } else {
    console.log('Habilitando formas existentes para delivery...');
    await prisma.paymentMethod.updateMany({
      where: { restaurantId: restaurant.id },
      data: { allowDelivery: true, isActive: true }
    });
  }
  
  console.log('Concluído!');
}

fix().catch(console.error).finally(() => prisma.$disconnect());
