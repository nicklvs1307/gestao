import axios from 'axios';
import fs from 'fs';

// Configuração
const BASE_URL = 'https://kicardapio.towersfy.com';
const EMAIL = 'papapizza11@kicardapio.com';
const PASSWORD = 'paPa%pIzZa@2026';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

async function login() {
  const response = await api.post('/api/auth/login', { email: EMAIL, password: PASSWORD });
  return response.data.token;
}

const pizzasSalgadas = [
  // Tradicionais
  { name: "Alemã", description: "Tomate seco, ervilha e mussarela", priceGrande: 34.90, priceBroto: 49.00 },
  { name: "Atum", description: "Atum, ervilha, cebola e mussarela", priceGrande: 34.90, priceBroto: 57.90 },
  { name: "Bacon", description: "Mussarela e bacon", priceGrande: 34.90, priceBroto: 54.90 },
  { name: "Bacon Brócolis", description: "Brócolis, bacon e mussarela", priceGrande: 34.90, priceBroto: 57.90 },
  { name: "Baiana", description: "Mussarela, calabresa, pimenta, cebola e ovo", priceGrande: 34.90, priceBroto: 51.50 },
  { name: "Brasuca", description: "Mussarela, ervilha, milho e ovo", priceGrande: 34.90, priceBroto: 49.90 },
  { name: "Brócolis", description: "Brócolis, alho, requeijão, mussarela e parmesão", priceGrande: 34.90, priceBroto: 54.90 },
  { name: "Calabresa", description: "Calabresa, mussarela e cebola", priceGrande: 34.90, priceBroto: 49.90 },
  { name: "Calafrango", description: "Mussarela, calabresa desfiada e frango", priceGrande: 34.90, priceBroto: 57.90 },
  { name: "Camponesa", description: "Mussarela, requeijão e milho verde", priceGrande: 34.90, priceBroto: 47.90 },
  // Queijos e especiais
  { name: "Cheddar", description: "Cheddar, mussarela, frango e milho", priceGrande: 34.90, priceBroto: 56.90 },
  { name: "Chilena", description: "Calabresa, mussarela, parmesão e cebola", priceGrande: 34.90, priceBroto: 56.90 },
  { name: "Cinco Queijos", description: "Mussarela, parmesão, provolone, gorgonzola e catupiry", priceGrande: 40.00, priceBroto: 59.90 },
  { name: "Costela", description: "Costela desfiada, bacon, mussarela, molho e barbecue", priceGrande: 42.00, priceBroto: 69.50 },
  { name: "Costela Catupiry", description: "Costela, bacon, molho, catupiry, orégano", priceGrande: 42.00, priceBroto: 69.50 },
  { name: "Cream Frango", description: "Frango, mussarela, cream cheese e batata palha", priceGrande: 34.90, priceBroto: 59.90 },
  { name: "Dois Queijos", description: "Mussarela e requeijão", priceGrande: 34.90, priceBroto: 49.90 },
  // Diferenciadas
  { name: "Doritos", description: "Mussarela, doritos, cheddar e molho", priceGrande: 38.50, priceBroto: 49.90 },
  { name: "Escarola", description: "Escarola, mussarela e bacon", priceGrande: 34.90, priceBroto: 49.90 },
  { name: "Espanhola", description: "Mussarela, pimentão, presunto e cream cheese", priceGrande: 34.90, priceBroto: 59.90 },
  { name: "Europeia", description: "Mussarela, bacon, ervilha e palmito", priceGrande: 34.90, priceBroto: 59.90 },
  { name: "Francesa", description: "Mussarela, champignon, ervilha e palmito", priceGrande: 34.90, priceBroto: 59.90 },
  { name: "Frango", description: "Frango, mussarela, requeijão, milho e parmesão", priceGrande: 34.90, priceBroto: 57.90 },
  { name: "Frango com Bacon", description: "Frango, requeijão, mussarela e bacon", priceGrande: 34.90, priceBroto: 59.50 },
  { name: "Frango com Catupiry", description: "Frango, catupiry, mussarela", priceGrande: 34.90, priceBroto: 55.50 },
  // Regionais e premium
  { name: "Gaúcha", description: "Bacon, pimentão, alho, tomate, parmesão e mussarela", priceGrande: 34.90, priceBroto: 55.90 },
  { name: "Gorgonzola", description: "Mussarela, gorgonzola, orégano e azeitona", priceGrande: 38.50, priceBroto: 59.90 },
  { name: "Grega", description: "Lombo, cebola, mussarela e palmito", priceGrande: 34.90, priceBroto: 50.50 },
  { name: "Gregoriana", description: "Mussarela, pernil desfiado e vinagrete", priceGrande: 34.90, priceBroto: 69.50 },
  { name: "Lombo", description: "Lombo, mussarela, ervilha, milho e cebola", priceGrande: 34.90, priceBroto: 51.90 },
  { name: "Lombo Especial", description: "Lombo, catupiry, mussarela, bacon e milho", priceGrande: 38.50, priceBroto: 56.90 },
  // Clássicas e autorais
  { name: "Marguerita", description: "Mussarela, alho, manjericão e tomate", priceGrande: 34.90, priceBroto: 49.90 },
  { name: "Mexicana", description: "Mussarela, calabresa, pimenta, cebola", priceGrande: 34.90, priceBroto: 59.90 },
  { name: "Milho", description: "Mussarela e milho", priceGrande: 34.90, priceBroto: 49.90 },
  { name: "Mineira", description: "Bacon, mussarela e parmesão", priceGrande: 34.90, priceBroto: 56.90 },
  { name: "Moda da Casa", description: "Lombo, tomate, cebola, mussarela e parmesão", priceGrande: 34.90, priceBroto: 55.90 },
  { name: "Moda do Cliente", description: "Escolha 6 ingredientes", priceGrande: 34.90, priceBroto: 69.90 },
  { name: "Mussarela", description: "Mussarela e tomate", priceGrande: 34.90, priceBroto: 49.90 },
  { name: "Palmito", description: "Palmito e mussarela", priceGrande: 34.90, priceBroto: 49.90 },
  { name: "Paulista", description: "Mussarela, calabresa e parmesão", priceGrande: 34.90, priceBroto: 54.90 },
  { name: "Peperoni", description: "Mussarela, peperoni, cebola e catupiry", priceGrande: 34.90, priceBroto: 61.90 },
  { name: "Peruana", description: "Mussarela, peito de peru, requeijão e tomate", priceGrande: 34.90, priceBroto: 56.90 },
  { name: "Pernil da Dita", description: "Pernil, calabresa, catupiry e manjericão", priceGrande: 34.90, priceBroto: 69.50 },
  { name: "Portuguesa", description: "Mussarela, palmito, requeijão, ovo, cebola, presunto", priceGrande: 38.50, priceBroto: 59.90 },
  { name: "Presunto", description: "Mussarela, presunto e tomate", priceGrande: 34.90, priceBroto: 49.90 },
  { name: "Quatro Queijos", description: "Mussarela, provolone, parmesão e requeijão", priceGrande: 38.50, priceBroto: 57.90 },
  { name: "Rúcula", description: "Rúcula, tomate seco e parmesão", priceGrande: 34.90, priceBroto: 57.90 },
  { name: "Saborosa", description: "Lombo, tomate cereja, pimenta, cream cheese", priceGrande: 34.90, priceBroto: 65.90 },
  { name: "Siciliana", description: "Cebola, champignon, mussarela e bacon", priceGrande: 34.90, priceBroto: 58.50 },
  { name: "Strogonoff de Carne", description: "Strogonoff, requeijão, champignon", priceGrande: 42.00, priceBroto: 63.50 },
  { name: "Strogonoff de Frango", description: "Frango, requeijão, champignon", priceGrande: 40.00, priceBroto: 61.50 },
  { name: "Três Queijos", description: "Mussarela, requeijão e parmesão", priceGrande: 34.90, priceBroto: 53.90 },
  { name: "Vegetariana", description: "Ervilha, palmito, champignon, milho", priceGrande: 34.90, priceBroto: 56.90 },
  { name: "Yasmin", description: "Atum, escarola e alho", priceGrande: 34.90, priceBroto: 58.90 }
];

const pizzasDoces = [
  { name: "Banana", description: "Banana, canela, açúcar e leite condensado", priceGrande: 34.90, priceBroto: 49.90 },
  { name: "Banana Nevada", description: "Banana, chocolate branco, canela", priceGrande: 34.90, priceBroto: 55.50 },
  { name: "Brigadeiro", description: "Chocolate e granulado", priceGrande: 34.90, priceBroto: 51.90 },
  { name: "Choconana", description: "Banana + chocolate", priceGrande: 34.90, priceBroto: 55.90 },
  { name: "Confeti", description: "Chocolate com confete", priceGrande: 34.90, priceBroto: 51.90 },
  { name: "Kinder Ovo", description: "Chocolate ao leite + branco", priceGrande: 34.90, priceBroto: 51.90 },
  { name: "Paçoquinha", description: "Chocolate + paçoca", priceGrande: 34.90, priceBroto: 51.90 },
  { name: "Prestígio", description: "Chocolate + coco", priceGrande: 34.90, priceBroto: 51.90 },
  { name: "Romeu e Julieta", description: "Queijo + goiabada", priceGrande: 34.90, priceBroto: 51.90 },
  { name: "Sensação", description: "Chocolate + morango", priceGrande: 34.90, priceBroto: 55.50 }
];

async function createAddonGroup(token, name, pizzas, isBroto = false) {
  const addons = pizzas.map((p, idx) => ({
    name: p.name,
    description: p.description,
    price: isBroto ? p.priceBroto : p.priceGrande,
    costPrice: 0,
    maxQuantity: 1,
    order: idx
  }));

  const payload = {
    name,
    type: "single",
    isRequired: true,
    isFlavorGroup: true,
    minQuantity: 1,
    maxQuantity: 1,
    priceRule: "higher",
    order: 0,
    addons
  };

  try {
    const response = await api.post('/api/addons', payload, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ ${name} criado com ${addons.length} sabores`);
    return response.data;
  } catch (error) {
    console.error(`❌ Erro ao criar ${name}:`, error.response?.data || error.message);
    throw error;
  }
}

async function main() {
  console.log('🔐 Fazendo login...');
  const token = await login();
  console.log('✅ Logado!\n');

  const todasPizzas = [...pizzasSalgadas, ...pizzasDoces];

  console.log('🍕 Criando Pizzas Grande (todas 64 pizzas)...');
  await createAddonGroup(token, 'Pizzas Grande', todasPizzas, false);

  console.log('\n🍕 Criando Pizzas Broto (todas 64 pizzas)...');
  await createAddonGroup(token, 'Pizzas Broto', todasPizzas, true);

  console.log('\n🎉 CADASTRO CONCLUÍDO!');
}

main().catch(console.error);