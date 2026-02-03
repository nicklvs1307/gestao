const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPizzas() {
  console.log("--- Verificando Produtos com 'Pizza' no nome ---");
  
  const pizzas = await prisma.product.findMany({
    where: { 
        OR: [
            { name: { contains: 'Pizza', mode: 'insensitive' } },
            { category: { name: { contains: 'Pizza', mode: 'insensitive' } } }
        ]
    },
    include: { category: true }
  });

  if (pizzas.length === 0) {
      console.log("Nenhuma pizza encontrada.");
      return;
  }

  pizzas.forEach(p => {
      console.log(`
Produto: ${p.name} (ID: ${p.id})`);
      console.log(`Categoria: ${p.category.name}`);
      console.log(`Preço Base: ${p.price}`);
      console.log(`Tem pizzaConfig? ${p.pizzaConfig ? 'SIM' : 'NÃO'}`);
      if (p.pizzaConfig) {
          console.log(`Config:`, p.pizzaConfig);
      } else {
          console.log("ALERTA: Este produto não tem configuração de pizza. Sabores serão ignorados pelo backend.");
      }
  });
}

checkPizzas()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
