const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('--- INICIANDO SEED DE PERMISSÕES E SUPERADMIN ---');

  // 1. Criar Permissões Base
  const permissionsList = [
    { name: 'all:manage', description: 'Acesso total ao sistema' },
    { name: 'orders:view', description: 'Visualizar pedidos' },
    { name: 'orders:manage', description: 'Criar e editar pedidos' },
    { name: 'pos:access', description: 'Acessar frente de caixa (PDV)' },
    { name: 'cashier:manage', description: 'Abrir e fechar caixa' },
    { name: 'financial:view', description: 'Ver fluxo de caixa' },
    { name: 'financial:manage', description: 'Lançar contas e movimentações' },
    { name: 'products:manage', description: 'Gerenciar cardápio e produtos' },
    { name: 'stock:manage', description: 'Gerenciar estoque e insumos' },
    { name: 'reports:view', description: 'Ver relatórios da loja' },
    { name: 'delivery:manage', description: 'Gerenciar entregas e motoboys' },
    { name: 'waiter:pos', description: 'Acesso ao terminal do garçom' },
    { name: 'settings:manage', description: 'Gerenciar configurações da loja' },
    // Permissões de Franquia
    { name: 'restaurants:manage', description: 'Gerenciar restaurantes da franquia' },
    { name: 'users:manage', description: 'Gerenciar usuários da franquia' },
    { name: 'reports:view_all', description: 'Ver relatórios globais' },
    { name: 'products:global_manage', description: 'Gerenciar cardápio global' },
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
      role: 'superadmin',
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
