import axios from 'axios';

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

const esfihasSalgadas = [
  { name: "Alemã", description: "Tomate seco, ervilha e mussarela", price: 10.00 },
  { name: "Atum", description: "Atum, ervilha, cebola e mussarela", price: 9.00 },
  { name: "Brócolis", description: "Brócolis, alho, requeijão e mussarela", price: 9.00 },
  { name: "Calabresa", description: "Calabresa, mussarela e cebola", price: 8.00 },
  { name: "Calafrango", description: "Mussarela, calabresa desfiada e frango", price: 12.00 },
  { name: "Camponesa", description: "Mussarela, requeijão e milho verde", price: 9.00 },
  { name: "Cinco Queijos", description: "Mussarela, parmesão, provolone, gorgonzola e catupiry", price: 12.00 },
  { name: "Costela Catupiry", description: "Costela, bacon, molho, catupiry", price: 12.00 },
  { name: "Dois Queijos", description: "Mussarela e requeijão", price: 8.00 },
  { name: "Doritos", description: "Mussarela, doritos, cheddar e molho", price: 10.00 },
  { name: "Escarola", description: "Escarola, mussarela e bacon", price: 8.00 },
  { name: "Frango", description: "Frango, mussarela, requeijão e milho", price: 9.00 },
  { name: "Gorgonzola", description: "Mussarela, gorgonzola e azeitona", price: 10.00 },
  { name: "Gregoriana", description: "Mussarela, pernil desfiado e vinagrete", price: 12.00 },
  { name: "Lombo", description: "Lombo, mussarela, ervilha, milho e cebola", price: 10.00 },
  { name: "Lombo Especial", description: "Lombo, catupiry, mussarela, bacon e milho", price: 12.00 },
  { name: "Marguerita", description: "Mussarela, alho, manjericão e tomate", price: 8.00 },
  { name: "Mexicana", description: "Mussarela, calabresa, pimenta e cebola", price: 10.00 },
  { name: "Milho", description: "Mussarela e milho", price: 6.00 },
  { name: "Mussarela", description: "Mussarela e tomate", price: 5.00 },
  { name: "Palmito", description: "Palmito e mussarela", price: 9.00 },
  { name: "Paulista", description: "Mussarela, calabresa e parmesão", price: 10.00 },
  { name: "Peperoni", description: "Mussarela e peperoni", price: 12.00 },
  { name: "Pernil da Dita", description: "Pernil, calabresa, catupiry e manjericão", price: 12.00 },
  { name: "Portuguesa", description: "Mussarela, palmito, requeijão, ovo e cebola", price: 10.00 },
  { name: "Quatro Queijos", description: "Mussarela, provolone, parmesão e requeijão", price: 10.00 },
  { name: "Rúcula", description: "Rúcula, tomate seco e parmesão", price: 12.00 },
  { name: "Siciliana", description: "Cebola, champignon, mussarela e bacon", price: 10.00 },
  { name: "Strogonoff Carne", description: "Strogonoff de carne, requeijão e champignon", price: 10.00 },
  { name: "Strogonoff Frango", description: "Strogonoff de frango, requeijão e champignon", price: 10.00 },
  { name: "Três Queijos", description: "Mussarela, requeijão e parmesão", price: 9.00 },
  { name: "Yasmin", description: "Atum, escarola e alho", price: 10.00 }
];

const esfihasDoces = [
  { name: "Banana", description: "Banana, canela, açúcar e leite condensado", price: 9.00 },
  { name: "Banana Nevada", description: "Banana, chocolate branco e canela", price: 10.00 },
  { name: "Brigadeiro", description: "Chocolate e granulado", price: 9.00 },
  { name: "Choconana", description: "Banana e chocolate", price: 10.00 },
  { name: "Confeti", description: "Chocolate com confete", price: 9.00 },
  { name: "Kinder Ovo", description: "Chocolate ao leite e branco", price: 9.00 },
  { name: "Paçoquinha", description: "Chocolate e paçoca", price: 9.00 },
  { name: "Prestígio", description: "Chocolate e coco", price: 9.00 },
  { name: "Romeu e Julieta", description: "Queijo e goiabada", price: 9.00 },
  { name: "Sensação", description: "Chocolate e morango", price: 10.00 }
];

async function createAddonGroup(token, name, pizzas) {
  const addons = pizzas.map((p, idx) => ({
    name: p.name,
    description: p.description,
    price: p.price,
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

  console.log('🥟 Criando Esfihas Salgadas...');
  await createAddonGroup(token, 'Esfihas Salgadas', esfihasSalgadas);

  console.log('\n🥟 Criando Esfihas Doces...');
  await createAddonGroup(token, 'Esfihas Doces', esfihasDoces);

  console.log('\n🎉 CADASTRO CONCLUÍDO!');
}

main().catch(console.error);