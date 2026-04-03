const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.restaurant.findFirst({ select: { id: true, name: true, plan: true, enabledModules: true } }).then(r => {
  console.log(JSON.stringify(r, null, 2));
  console.log('type:', typeof r.enabledModules, Array.isArray(r.enabledModules));
}).finally(() => p.$disconnect());
