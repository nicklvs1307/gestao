const MODULE_PERMISSIONS = {
  orders: [
    'orders:view',
    'orders:manage',
    'orders:edit_items',
    'orders:cancel',
    'orders:transfer',
    'orders:payment_change',
    'orders:discount'
  ],
  pos: [
    'pos:access'
  ],
  products: [
    'products:view',
    'products:manage',
    'categories:manage'
  ],
  settings: [
    'settings:view',
    'settings:manage',
    'users:manage',
    'table:manage',
    'integrations:manage'
  ],
  delivery: [
    'delivery:manage'
  ],
  financial: [
    'financial:view',
    'financial:manage',
    'cashier:manage',
    'bank_accounts:manage',
    'financial_categories:manage',
    'waiter_settlement:manage',
    'driver_settlement:manage'
  ],
  reports: [
    'reports:view',
    'reports:financial',
    'reports:performance'
  ],
  customers: [
  ],
  coupons: [
  ],
  kds: [
    'kds:view'
  ],
  checklists: [
    'checklists:manage',
    'checklists:view',
    'sectors:manage'
  ],
  stock: [
    'stock:view',
    'stock:manage',
    'suppliers:manage',
    'reports:abc'
  ],
  dashboards: [
    'reports:view'
  ],
  whatsapp: [
    'settings:manage'
  ],
  fiscal: [
    'settings:manage'
  ],
  integrations: [
    'integrations:manage'
  ],
  franchise: [
    'franchise:manage',
    'reports:view_all'
  ]
};

function getPermissionsForModules(modules) {
  const perms = new Set();
  for (const mod of modules) {
    const modPerms = MODULE_PERMISSIONS[mod] || [];
    for (const p of modPerms) {
      perms.add(p);
    }
  }
  return Array.from(perms);
}

function getModulesForPermission(permissionName) {
  const modules = [];
  for (const [mod, perms] of Object.entries(MODULE_PERMISSIONS)) {
    if (perms.includes(permissionName)) {
      modules.push(mod);
    }
  }
  return modules;
}

module.exports = {
  MODULE_PERMISSIONS,
  getPermissionsForModules,
  getModulesForPermission
};
