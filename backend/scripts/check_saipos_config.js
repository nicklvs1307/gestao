const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSettings() {
  const settings = await prisma.integrationSettings.findFirst({
    where: { restaurantId: 'clgq0v1y00000t3d8b4e6f2g1' }
  });
  
  if (settings) {
    console.log('--- Configurações Atuais ---');
    console.log('Partner ID:', settings.saiposPartnerId ? `"${settings.saiposPartnerId}"` : 'NULL');
    console.log('Secret:', settings.saiposSecret ? `"${settings.saiposSecret}"` : 'NULL');
    console.log('Store Code:', settings.saiposCodStore ? `"${settings.saiposCodStore}"` : 'NULL');
    console.log('Active:', settings.saiposIntegrationActive);
  } else {
    console.log('Configurações não encontradas para este ID.');
  }
}

checkSettings()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
