const { PrismaClient, OrderStatus } = require('@prisma/client');
const { faker } = require('@faker-js/faker/locale/pt_BR'); // Usando o locale em português
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// --- Funções Auxiliares para Geração de Nomes ---

// Nomes mais criativos para produtos
const pt = {
  adjectives: ['Clássico', 'Especial', 'Da Casa', 'Gourmet', 'Artesanal', 'Saboroso', 'Delicioso', 'Exclusivo', 'Tradicional', 'Supremo'],
  pizzaNames: ['Margherita', 'Calabresa', 'Frango com Catupiry', 'Portuguesa', 'Quatro Queijos', 'Pepperoni', 'Mussarela', 'Bacon', 'Rúcula com Tomate Seco'],
  burgerNames: ['X-Burger', 'X-Salada', 'X-Bacon', 'X-Tudo', 'Duplo', 'Smash', 'Vegetariano'],
  drinkNames: ['Refrigerante', 'Suco Natural', 'Água com Gás', 'Cerveja Artesanal', 'Vinho', 'Coquetel'],
  dessertNames: ['Pudim', 'Mousse de Chocolate', 'Torta de Limão', 'Cheesecake', 'Sorvete Artesanal', 'Brownie'],
  entryNames: ['Batata Frita', 'Anéis de Cebola', 'Bruschetta', 'Dadinho de Tapioca', 'Frango a Passarinho'],
  mainDish: {
    carnes: ['Picanha na Chapa', 'Filé Mignon ao Molho Madeira', 'Costela no Bafo'],
    massas: ['Lasanha à Bolonhesa', 'Espaguete ao Carbonara', 'Nhoque ao Sugo'],
    peixes: ['Salmão Grelhado', 'Moqueca de Peixe', 'Tilápia Frita'],
  }
};

// Função para gerar um nome de produto baseado na categoria
// Adicionado um Set para garantir a unicidade dos nomes gerados nesta execução
const generatedProductNames = new Set();

function generateProductName(categoryName) {
    const randomAdjective = faker.helpers.arrayElement(pt.adjectives);
    let baseName = '';

    const lowerCategoryName = categoryName.toLowerCase();

    if (lowerCategoryName.includes('pizza')) {
        baseName = `Pizza de ${faker.helpers.arrayElement(pt.pizzaNames)}`;
    } else if (lowerCategoryName.includes('hambúrguer') || lowerCategoryName.includes('lanche')) {
        baseName = `Hambúrguer ${faker.helpers.arrayElement(pt.burgerNames)}`;
    } else if (lowerCategoryName.includes('bebida')) {
        const drinkType = faker.helpers.arrayElement(pt.drinkNames);
        if (drinkType === 'Suco Natural') {
            baseName = `Suco de ${faker.helpers.arrayElement(['Laranja', 'Abacaxi', 'Morango', 'Uva', 'Maracujá'])}`;
        } else if (drinkType === 'Refrigerante') {
            baseName = `Refrigerante ${faker.helpers.arrayElement(['Cola', 'Guaraná', 'Laranja', 'Limão'])}`;
        } else {
            baseName = drinkType;
        }
    } else if (lowerCategoryName.includes('sobremesa')) {
        baseName = faker.helpers.arrayElement(pt.dessertNames);
    } else if (lowerCategoryName.includes('entrada')) {
        baseName = faker.helpers.arrayElement(pt.entryNames);
    } else if (pt.mainDish[lowerCategoryName]) {
        baseName = faker.helpers.arrayElement(pt.mainDish[lowerCategoryName]);
    } else {
        baseName = faker.commerce.productName();
    }

    // Garante que o nome final seja único nesta execução do script
    let finalName = `${baseName} ${randomAdjective}`;
    while (generatedProductNames.has(finalName)) {
        finalName = `${finalName} ${faker.number.int({ min: 1, max: 99 })}`;
    }
    generatedProductNames.add(finalName);
    return finalName;
}


async function main() {
  console.log('--- INICIANDO SCRIPT DE POPULARIZAÇÃO (SEED) ---');

  // 1. VERIFICAÇÃO DE DADOS EXISTENTES (Proteção)
  const existingRestaurants = await prisma.restaurant.count();
  if (existingRestaurants > 0) {
    console.log('O banco de dados já possui dados. Script de seed abortado para evitar duplicidade ou perda de dados reais.');
    return;
  }

  // Limpa o set de nomes de produtos gerados
  generatedProductNames.clear();

  // 2. CRIAÇÃO DO RESTAURANTE
  console.log('Criando restaurante de teste...');
  const restaurant = await prisma.restaurant.create({
    data: {
      id: 'clgq0v1y00000t3d8b4e6f2g1', // ID fixo
      name: 'Hamburgueria Sabor Artesanal',
      slug: 'hamburgueria-sabor-artesanal',
      address: faker.location.streetAddress(),
      phone: faker.phone.number(),
      logoUrl: faker.image.urlLoremFlickr({ category: 'food' }),
    },
  });
  console.log(`Restaurante "${restaurant.name}" criado.`);

  // 3. CRIAÇÃO DE USUÁRIO ADMIN
  console.log('Criando usuário administrador...');
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  await prisma.user.create({
    data: {
      email: 'admin@hamburgueriateste.com',
      name: 'Admin Geral',
      passwordHash: adminPasswordHash,
      role: 'admin',
      restaurantId: restaurant.id,
    },
  });
  console.log('Usuário administrador criado (admin@hamburgueriateste.com / admin123).');

  // 4. CRIAÇÃO DE CONFIGURAÇÕES
  console.log('Criando configurações do restaurante...');
  await prisma.restaurantSettings.create({ data: { restaurantId: restaurant.id } });
  await prisma.integrationSettings.create({ data: { restaurantId: restaurant.id } });
  console.log('Configurações padrão criadas.');

  // 5. CRIAÇÃO DE MESAS
  console.log('Criando mesas...');
  for (let i = 1; i <= 20; i++) {
    await prisma.table.create({ data: { number: i, restaurantId: restaurant.id } });
  }
  console.log('20 mesas criadas.');

  // 6. CRIAÇÃO DE CATEGORIAS E PRODUTOS
  console.log('Criando categorias e produtos em português...');
  const categoriesData = [
    { name: 'Entradas', icon: 'fa-concierge-bell', count: 4 },
    { name: 'Hambúrgueres', icon: 'fa-hamburger', count: 5, sub: ['Carne Bovina', 'Frango', 'Vegetariano'] },
    { name: 'Pizzas', icon: 'fa-pizza-slice', count: 5, sub: ['Tradicionais', 'Especiais', 'Doces'] },
    { name: 'Lanches', icon: 'fa-bread-slice', count: 5 },
    { name: 'Pratos Principais', icon: 'fa-utensils', count: 3, sub: ['Carnes', 'Massas', 'Peixes'] },
    { name: 'Sobremesas', icon: 'fa-ice-cream', count: 4 },
    { name: 'Bebidas', icon: 'fa-cocktail', count: 5, sub: ['Não Alcoólicas', 'Alcoólicas'] },
  ];

  const createdProducts = [];

  for (const catData of categoriesData) {
    const category = await prisma.category.create({
      data: { name: catData.name, restaurantId: restaurant.id },
    });

    if (catData.sub) {
      for (const subName of catData.sub) {
        const subCategory = await prisma.category.create({
          data: { name: subName, parentId: category.id, restaurantId: restaurant.id },
        });
        for (let i = 0; i < (catData.count || 5); i++) {
          const product = await createProduct(subCategory.id, restaurant.id, subName);
          if(product) createdProducts.push(product);
        }
      }
    } else {
      for (let i = 0; i < (catData.count || 5); i++) {
        const product = await createProduct(category.id, restaurant.id, catData.name);
        if(product) createdProducts.push(product);
      }
    }
  }
  console.log(`${createdProducts.length} produtos criados em suas categorias.`);

  // 7. CRIAÇÃO DE PROMOÇÕES
  console.log('Criando promoções em português...');
  const productForPromo = createdProducts.find(p => p.name.toLowerCase().includes('hambúrguer'));
  if (productForPromo) {
    await prisma.promotion.create({
      data: {
        name: 'Hambúrguer do Dia',
        description: 'Nosso hambúrguer especial da casa com 20% de desconto!',
        discountType: 'percentage',
        discountValue: 20,
        startDate: faker.date.past({ years: 1 }),
        endDate: faker.date.future({ years: 1 }),
        isActive: true,
        restaurantId: restaurant.id,
        productId: productForPromo.id,
      },
    });
    console.log('Promoção de teste criada.');
  } else {
    console.log('Nenhum hambúrguer encontrado para criar promoção.');
  }


  // 8. CRIAÇÃO DE PEDIDOS FALSOS
  console.log('Criando pedidos falsos para o painel Kanban...');
  const statuses = [OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.COMPLETED, OrderStatus.CANCELED];
  for (let i = 0; i < 15; i++) {
    if (createdProducts.length === 0) continue;
    const orderStatus = faker.helpers.arrayElement(statuses);
    const orderItems = faker.helpers.arrayElements(createdProducts, faker.number.int({ min: 1, max: 4 }));
    const total = orderItems.reduce((sum, item) => sum + item.price, 0);

    await prisma.order.create({
      data: {
        tableNumber: faker.number.int({ min: 1, max: 20 }),
        status: orderStatus,
        total: total,
        restaurantId: restaurant.id,
        items: {
          create: orderItems.map(item => ({
            productId: item.id,
            quantity: faker.number.int({ min: 1, max: 2 }),
            priceAtTime: item.price,
            observations: faker.lorem.sentence(),
          })),
        },
      },
    });
  }
  console.log('15 pedidos falsos criados com status variados.');

  console.log('--- SCRIPT DE POPULARIZAÇÃO FINALIZADO ---');
}

// Função auxiliar para criar um produto com dados falsos em português
async function createProduct(categoryId, restaurantId, categoryName) {
  const productName = generateProductName(categoryName);
  
  try {
    const product = await prisma.product.create({
      data: {
        name: productName,
        description: faker.lorem.paragraph(),
        price: parseFloat(faker.commerce.price({ min: 15, max: 80, dec: 2 })),
        imageUrl: faker.image.urlLoremFlickr({ category: 'food' }),
        isAvailable: true,
        restaurantId: restaurantId,
        categoryId: categoryId,
        // Adiciona tamanhos para pizzas
        ...(categoryName.toLowerCase().includes('pizza') && {
          sizes: {
            create: [
              { name: 'Pequena', price: parseFloat(faker.commerce.price({ min: 25, max: 40, dec: 2 })) },
              { name: 'Média', price: parseFloat(faker.commerce.price({ min: 41, max: 55, dec: 2 })) },
              { name: 'Grande', price: parseFloat(faker.commerce.price({ min: 56, max: 70, dec: 2 })) },
            ],
          },
          addonGroups: {
            create: [
              {
                name: 'Bordas Recheadas',
                type: 'single',
                restaurantId: restaurantId,
                addons: {
                  create: [
                    { name: 'Catupiry', price: 8 },
                    { name: 'Cheddar', price: 9 },
                    { name: 'Chocolate', price: 10 },
                  ],
                },
              },
            ],
          },
        }),
        // Adiciona adicionais para hambúrgueres
        ...(categoryName.toLowerCase().includes('hambúrguer') && {
           addonGroups: {
            create: [
              {
                name: 'Adicionais',
                type: 'multiple',
                restaurantId: restaurantId,
                addons: {
                  create: [
                    { name: 'Bacon Extra', price: 5 },
                    { name: 'Cheddar Extra', price: 4 },
                    { name: 'Ovo', price: 3 },
                  ],
                },
              },
            ],
          },
        }),
      },
    });
    return product;
  } catch (error) {
      if (error.code === 'P2002') {
          console.warn(`Aviso: O nome de produto "${productName}" já existe e foi pulado.`);
          return null;
      }
      throw error;
  }
}

main()
  .catch((e) => {
    console.error('Erro durante a execução do seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
