const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('--- INICIANDO SEED DE PERMISSÕES E CONSOLIDAÇÃO ---');

  // 1. Criar/Atualizar Permissões Base
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
    { name: 'pos:access', description: 'Acesso ao Frente de Caixa (PDV)' },
    { name: 'kds:view', description: 'Acesso ao monitor da cozinha (KDS)' },
    { name: 'table:manage', description: 'Gerenciar layout de mesas' },

    // LOGÍSTICA / ENTREGA
    { name: 'delivery:manage', description: 'Gestão de Entregas e Tela do Entregador' },

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
    { name: 'reports:view_all', description: 'Ver relatórios de todas as lojas (Franquia)' },

    // OPERACIONAL / CHECKLIST
    { name: 'checklists:manage', description: 'Gerenciar modelos de checklist' },
    { name: 'checklists:view', description: 'Visualizar histórico e preencher checklists' },
    { name: 'sectors:manage', description: 'Gerenciar setores da unidade' },

    // GESTÃO DE FRANQUIA
    { name: 'franchise:manage', description: 'Gerenciar lojas e usuários da própria franquia' },

    // CONFIGURAÇÕES DA LOJA
    { name: 'settings:view', description: 'Ver dados da loja' },
    { name: 'settings:manage', description: 'Alterar configurações e dados fiscais' },
    { name: 'users:manage', description: 'Gerenciar equipe e permissões' },
    { name: 'integrations:manage', description: 'Configurar iFood / Saipos / Impressão' },
  ];

  console.log('Sincronizando permissões...');
  for (const p of permissionsList) {
    await prisma.permission.upsert({
      where: { name: p.name },
      update: { description: p.description },
      create: p,
    });
  }

  // 2. Resolver Redundância: "admin" -> "Administrador"
  console.log('Resolvendo redundâncias de cargos...');
  const legacyAdminRole = await prisma.role.findFirst({ where: { name: 'admin', franchiseId: null } });
  if (legacyAdminRole) {
      console.log('Migrando cargo "admin" para "Administrador"...');
      await prisma.role.update({
          where: { id: legacyAdminRole.id },
          data: { name: 'Administrador' }
      });
  }

  const legacyStaffRole = await prisma.role.findFirst({ where: { name: 'staff', franchiseId: null } });
  if (legacyStaffRole) {
      console.log('Migrando cargo "staff" para "Atendente"...');
      await prisma.role.update({
          where: { id: legacyStaffRole.id },
          data: { name: 'Atendente' }
      });
  }

  // 3. Criar/Atualizar Role de Super Admin
  let superAdminRole = await prisma.role.findFirst({
    where: { name: 'Super Admin', franchiseId: null }
  });

  if (!superAdminRole) {
    superAdminRole = await prisma.role.create({
      data: {
        name: 'Super Admin',
        description: 'Administrador global do sistema',
        isSystem: true,
        permissions: { connect: permissionsList.map(p => ({ name: p.name })) },
      },
    });
  } else {
      await prisma.role.update({
          where: { id: superAdminRole.id },
          data: { permissions: { set: permissionsList.map(p => ({ name: p.name })) } }
      });
  }

  // 4. Configuração dos Cargos do Sistema
  const rolesToCreate = [
    {
      name: 'Administrador',
      description: 'Gestão completa da loja',
      permissions: permissionsList.filter(p => p.name !== 'all:manage' && p.name !== 'reports:view_all' && p.name !== 'franchise:manage').map(p => p.name)
    },
    {
      name: 'Franqueador',
      description: 'Gestão de todas as lojas da franquia',
      permissions: ['franchise:manage', 'reports:view_all', 'users:manage', 'settings:view', 'products:view']
    },
    {
      name: 'Garçom',
      description: 'Atendimento de mesas e pedidos',
      permissions: ['orders:view', 'orders:manage', 'waiter:pos']
    },
    {
      name: 'Atendente',
      description: 'Vendas no balcão e pedidos',
      permissions: ['orders:view', 'orders:manage', 'pos:access']
    },
    {
      name: 'Caixa',
      description: 'Operação de caixa e recebimentos',
      permissions: ['orders:view', 'orders:manage', 'pos:access', 'cashier:manage']
    },
    {
      name: 'Cozinha',
      description: 'Monitor de produção',
      permissions: ['orders:view', 'kds:view']
    },
    {
      name: 'Entregador',
      description: 'Logística de entregas',
      permissions: ['delivery:manage']
    }
  ];

  console.log('Sincronizando cargos operacionais...');
  for (const r of rolesToCreate) {
    let role = await prisma.role.findFirst({ where: { name: r.name, franchiseId: null } });
    
    if (!role) {
      await prisma.role.create({
        data: {
          name: r.name,
          description: r.description,
          isSystem: true,
          permissions: { connect: r.permissions.map(p => ({ name: p })) }
        }
      });
    } else {
        await prisma.role.update({
            where: { id: role.id },
            data: {
                description: r.description,
                permissions: { set: r.permissions.map(p => ({ name: p })) }
            }
        });
    }
  }

  // 5. Garantir SuperAdmin
  const adminPasswordHash = await bcrypt.hash('superadmin123', 10);
  await prisma.user.upsert({
    where: { email: 'super@admin.com' },
    update: { isSuperAdmin: true, roleId: superAdminRole.id },
    create: {
      email: 'super@admin.com',
      name: 'Super Admin Global',
      passwordHash: adminPasswordHash,
      isSuperAdmin: true,
      roleId: superAdminRole.id,
    },
  });

  console.log('--- SEED FINALIZADO COM SUCESSO ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
