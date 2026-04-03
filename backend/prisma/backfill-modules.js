const { PrismaClient } = require('@prisma/client');
const { getModulesForPlan } = require('../src/config/planModules');

const prisma = new PrismaClient();

async function backfillEnabledModules() {
    console.log('Backfilling enabledModules for existing restaurants...');
    
    const restaurants = await prisma.restaurant.findMany({
        select: { id: true, name: true, plan: true, enabledModules: true }
    });
    
    let updated = 0;
    
    for (const r of restaurants) {
        if (!r.enabledModules) {
            const modules = getModulesForPlan(r.plan);
            await prisma.restaurant.update({
                where: { id: r.id },
                data: { enabledModules: modules }
            });
            console.log(`  ✓ ${r.name} (${r.plan}) → ${modules.length} módulos`);
            updated++;
        } else {
            console.log(`  - ${r.name} já tem enabledModules configurado`);
        }
    }
    
    console.log(`\nDone! ${updated} restaurantes atualizados.`);
}

backfillEnabledModules()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
