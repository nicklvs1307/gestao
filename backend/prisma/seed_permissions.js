const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('--- INICIANDO SEED DE PERMISSÕES E SUPERADMIN ---');

  // 1. Criar Permissões Base (Categorizadas conforme imagem)
  const permissionsList = [
    { name: 'all:manage', description: 'Acesso total ao sistema (SuperAdmin)' },
    
    // VENDAS / PEDIDOS
    { name: 'orders:view', description: 'Visualizar pedidos e mesas' },
    { name: 'orders:manage', description: 'Criar novos pedidos' },
    { name: 'orders:edit_items', description: 'Editar itens de pedidos em aberto' },
    { name: 'orders:cancel', description: 'Cancelamento de pedidos e itens' },
    { name: 'orders:transfer', description: 'Transferência de mesas e itens' },
    { name: 'orders:payment_change', description: 'Alterar forma de pagamento' },
    { name: 'orders:discount', description: 'Aplicar descontos em pedidos' },
    { name: 'waiter:pos', description: 'Acesso ao terminal do garçom' },
    { name: 'kds:view', description: 'Acesso ao monitor da cozinha (KDS)' },
    { name: 'table:manage', description: 'Gerenciar layout de mesas' },

    // FINANCEIRO
    { name: 'financial:view', description: 'Visualizar fluxo de caixa' },
    { name: 'financial:manage', description: 'Lançamentos de receitas e despesas' },
    { name: 'cashier:manage', description: 'Abertura e fechamento de caixa' },
    { name: 'bank_accounts:manage', description: 'Gerenciar contas bancárias e conciliação' },
    { name: 'financial_categories:manage', description: 'Gerenciar categorias financeiras' },
    { name: 'waiter_settlement:manage', description: 'Acerto de contas de garçons' },
    { name: 'driver_settlement:manage', description: 'Acerto de contas de entregadores' },

    // ESTOQUE / PRODUTOS
    { name: 'products:view', description: 'Visualizar cardápio' },
    { name: 'products:manage', description: 'Gerenciar produtos e preços' },
    { name: 'categories:manage', description: 'Gerenciar categorias do cardápio' },
    { name: 'stock:view', description: 'Visualizar posição de estoque' },
    { name: 'stock:manage', description: 'Entradas, saídas e ficha técnica' },
    { name: 'suppliers:manage', description: 'Gerenciar fornecedores' },

    // RELATÓRIOS
    { name: 'reports:view', description: 'Acesso a relatórios básicos' },
    { name: 'reports:financial', description: 'Ver DRE e relatórios financeiros' },
    { name: 'reports:performance', description: 'Ver desempenho de atendentes/garçons' },
    { name: 'reports:abc', description: 'Ver Curva ABC de produtos' },

    // CONFIGURAÇÕES DA LOJA
    { name: 'settings:view', description: 'Ver dados da loja' },
    { name: 'settings:manage', description: 'Alterar configurações e dados fiscais' },
    { name: 'users:manage', description: 'Gerenciar equipe e permissões' },
    { name: 'integrations:manage', description: 'Configurar iFood / Saipos / Impressão' },
  ];

  console.log('Criando permissões...');
  for (const p of permissionsList) {
    await prisma.permission.upsert({
      where: { name: p.name },
      update: { description: p.description },
      create: p,
    });
  }

  // ... (Super Admin e Franqueador mantidos) ...

  // 5. Criar Roles padrão de Operação
  const rolesToCreate = [
    {
      name: 'Garçom',
      permissions: ['orders:view', 'orders:manage', 'waiter:pos']
    },
    {
      name: 'Atendente',
      permissions: ['orders:view', 'orders:manage', 'pos:access']
    },
    {
      name: 'Caixa',
      permissions: ['orders:view', 'orders:manage', 'pos:access', 'cashier:manage']
    },
    {
      name: 'Cozinha',
      permissions: ['orders:view']
    },
    {
      name: 'Entregador',
      permissions: ['orders:view', 'delivery:manage']
    },
    {
      name: 'Administrador',
      permissions: permissionsList.filter(p => p.name !== 'all:manage').map(p => p.name)
    }
  ];

  for (const r of rolesToCreate) {
    let role = await prisma.role.findFirst({ where: { name: r.name, franchiseId: null } });
    if (!role) {
      await prisma.role.create({
        data: {
          name: r.name,
          isSystem: true,
          permissions: {
            connect: r.permissions.map(p => ({ name: p }))
          }
        }
      });
    }
  }

  // 2. Criar Role de Super Admin
  console.log('Criando role de Super Admin...');
  let superAdminRole = await prisma.role.findFirst({
    where: { name: 'Super Admin', franchiseId: null }
  });

  if (!superAdminRole) {
    superAdminRole = await prisma.role.create({
      data: {
        name: 'Super Admin',
        description: 'Administrador global do sistema',
        isSystem: true,
        permissions: {
          connect: permissionsList.map(p => ({ name: p.name })),
        },
      },
    });
  }

  // 3. Criar Usuário SuperAdmin
  console.log('Criando usuário SuperAdmin...');
  const adminPasswordHash = await bcrypt.hash('superadmin123', 10);
  await prisma.user.upsert({
    where: { email: 'super@admin.com' },
    update: {
      isSuperAdmin: true,
      roleId: superAdminRole.id,
    },
    create: {
      email: 'super@admin.com',
      name: 'Super Admin Global',
      passwordHash: adminPasswordHash,
      isSuperAdmin: true,
      roleId: superAdminRole.id,
    },
  });

  // 4. Criar Roles padrão para Franquias (Exemplo)
  console.log('Criando roles padrão de franquia...');
  let franchisorRole = await prisma.role.findFirst({
    where: { name: 'Franqueador Admin', franchiseId: null }
  });

  if (!franchisorRole) {
    franchisorRole = await prisma.role.create({
      data: {
        name: 'Franqueador Admin',
        description: 'Gestor da Franquia',
        isSystem: true,
        permissions: {
          connect: [
            { name: 'restaurants:manage' },
            { name: 'users:manage' },
            { name: 'reports:view_all' },
            { name: 'products:global_manage' },
          ]
        }
      }
    });
  }

  console.log('--- SEED DE PERMISSÕES FINALIZADO ---');
  console.log('Login: super@admin.com / Senha: superadmin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
