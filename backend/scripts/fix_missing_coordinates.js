const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const prisma = new PrismaClient();

async function main() {
  console.log('--- INICIANDO RECUPERAÇÃO DE COORDENADAS PARA MAPA DE CALOR ---');

  const apiKey = process.env.VITE_OPENROUTE_KEY || process.env.OPENROUTE_KEY;
  if (!apiKey) {
      console.error("ERRO: Variável VITE_OPENROUTE_KEY ou OPENROUTE_KEY não encontrada.");
      return;
  }

  // 1. Buscar todos os pedidos concluídos sem coordenadas
  const orders = await prisma.deliveryOrder.findMany({
    where: {
      latitude: null,
      longitude: null,
      address: { not: 'Retirada no Balcão' }
    }
  });

  console.log(`Encontrados ${orders.length} pedidos para processar.`);

  for (const order of orders) {
    try {
      console.log(`Localizando: ${order.address}...`);
      
      const url = `https://api.openrouteservice.org/geocode/search?api_key=${apiKey}&text=${encodeURIComponent(order.address)}&boundary.country=BR&size=1`;
      const response = await axios.get(url);
      
      if (response.data.features && response.data.features.length > 0) {
        const [lng, lat] = response.data.features[0].geometry.coordinates;
        
        await prisma.deliveryOrder.update({
            where: { id: order.id },
            data: { latitude: lat, longitude: lng }
        });

        console.log(`[OK] Pedido #${order.orderId} localizado.`);
      } else {
        console.warn(`[AVISO] Endereço não encontrado: ${order.address}`);
      }

      // Pequena pausa para respeitar o rate limit da API gratuita
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (err) {
      console.error(`[ERRO] Falha ao processar pedido #${order.id}:`, err.message);
    }
  }

  console.log('--- RECUPERAÇÃO FINALIZADA ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
