const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const logger = require('./src/config/logger');
require('dotenv').config();
const path = require('path');

if (!process.env.JWT_SECRET) {
  throw new Error('ERRO FATAL: JWT_SECRET não está definido. Verifique seu arquivo .env.');
}

const app = express();
const PORT = process.env.PORT || 3001;

// 1. SEGURANÇA: Confiar no Proxy (Necessário para Cloudflare/Traefik)
app.set('trust proxy', 1);

// 2. LOGGING: Captura requisições HTTP e envia para o Winston
app.use(morgan('combined', { stream: logger.stream }));

// 2. SEGURANÇA: Configuração de Headers (Helmet)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// 3. SEGURANÇA: Configuração de CORS Restrita
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['*'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Não permitido pelo CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-restaurant-id']
}));

app.use(express.json());

// 4. SEGURANÇA: Rate Limiting Global (SPA Friendly)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000, // Aumentado para 5000 para evitar 429 em uso intenso de dashboards
  message: { error: 'Muitas requisições vindas deste IP. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', globalLimiter);

// 5. SEGURANÇA: Rate Limiting Específico para Login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Aumentado para 20 tentativas para evitar falsos positivos
  message: { error: 'Muitas tentativas de login. Tente novamente mais tarde.' }
});
app.use('/api/auth/login', loginLimiter);

// Arquivos Estáticos (Imagens)
// Serve tanto via /uploads quanto via /api/uploads para compatibilidade com Proxy
const uploadsPath = path.join(__dirname, 'public/uploads');
app.use('/uploads', express.static(uploadsPath));
app.use('/api/uploads', express.static(uploadsPath));

// ==================================================================
// ROTAS
// ==================================================================

const authRoutes = require('./src/routes/authRoutes');
const productRoutes = require('./src/routes/productRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const cashierRoutes = require('./src/routes/cashierRoutes');
const financialRoutes = require('./src/routes/financialRoutes');
const fiscalRoutes = require('./src/routes/fiscalRoutes');
const stockRoutes = require('./src/routes/stockRoutes');
const promotionRoutes = require('./src/routes/promotionRoutes');
const settingsRoutes = require('./src/routes/settingsRoutes');
const integrationRoutes = require('./src/routes/integrationRoutes');
const tableRoutes = require('./src/routes/tableRoutes');
const customerRoutes = require('./src/routes/customerRoutes');
const reportRoutes = require('./src/routes/reportRoutes');
const deliveryRoutes = require('./src/routes/deliveryRoutes');
const driverRoutes = require('./src/routes/driverRoutes');
const deliveryAreaRoutes = require('./src/routes/deliveryAreaRoutes');
const paymentMethodRoutes = require('./src/routes/paymentMethodRoutes');
const superAdminRoutes = require('./src/routes/superAdminRoutes');
const franchiseRoutes = require('./src/routes/franchiseRoutes');
const whatsappRoutes = require('./src/routes/whatsappRoutes');

// SuperAdmin / Admin Role Management Alias
const SuperAdminController = require('./src/controllers/SuperAdminController');
const { needsAuth, checkPermission } = require('./src/middlewares/auth');

app.get('/api/admin/permissions', needsAuth, checkPermission('users:manage'), SuperAdminController.getPermissions);
app.get('/api/admin/roles', needsAuth, checkPermission('users:manage'), SuperAdminController.getRoles);
app.put('/api/admin/roles/:id/permissions', needsAuth, checkPermission('users:manage'), SuperAdminController.updateRolePermissions);

app.use('/api/auth', authRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/franchise', franchiseRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/global-sizes', require('./src/routes/globalSizeRoutes'));
app.use('/api/addons', require('./src/routes/addonRoutes'));
app.use('/api/ingredients', require('./src/routes/ingredientRoutes'));
app.use('/api/production', require('./src/routes/productionRoutes'));

// === ROTAS DE OPERAÇÃO (CHECKLIST) ===
app.use('/api/checklists', require('./src/routes/checklistRoutes'));
app.use('/api/sectors', require('./src/routes/sectorRoutes'));
app.use('/api/admin/orders', orderRoutes);
app.use('/api/cashier', cashierRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/fiscal', fiscalRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/ingredients', require('./src/routes/ingredientRoutes'));
app.use('/api/production', require('./src/routes/productionRoutes'));
app.use('/api/promotions', promotionRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/admin/reports', reportRoutes);
app.use('/api/admin/waiters', require('./src/routes/waiterRoutes')); // Nova rota de Acerto Garçom
app.use('/api/delivery', deliveryRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/delivery-areas', deliveryAreaRoutes);
app.use('/api/payment-methods', paymentMethodRoutes);
app.use('/api/sectors', require('./src/routes/sectorRoutes'));
app.use('/api/checklists', require('./src/routes/checklistRoutes'));
app.use('/api/whatsapp', whatsappRoutes);

// KDS Alias
const OrderController = require('./src/controllers/OrderController');
app.get('/api/kds/items', needsAuth, OrderController.getKdsItems);

// Client Specific (Matching old structure)
const TableController = require('./src/controllers/TableController');
const ProductController = require('./src/controllers/ProductController');
const CategoryController = require('./src/controllers/CategoryController');

app.get('/api/client/products/:restaurantId', ProductController.getClientProducts);
app.get('/api/client/categories/:restaurantId', CategoryController.getClientCategories);
app.use('/api/client/promotions', promotionRoutes);
app.use('/api/client/settings', settingsRoutes);
app.get('/api/client/table-info', TableController.checkTableExists);
app.get('/api/client/order/table', TableController.getClientTableOrder);
app.post('/api/client/table-requests', TableController.createClientTableRequest);

// Root
app.get('/api', (req, res) => res.send('API Online!'));

// Middleware de Tratamento de Erros Global (DEVE SER O ÚLTIMO)
const errorHandler = require('./src/middlewares/errorHandler');
app.use(errorHandler);

const http = require('http');
const server = http.createServer(app);
const socketLib = require('./src/lib/socket');
socketLib.init(server);

server.listen(PORT, () => logger.info(`Servidor rodando em http://localhost:${PORT}`));
