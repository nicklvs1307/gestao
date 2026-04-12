const prisma = require('../lib/prisma');
const logger = require('../config/logger');

const getRestaurantPreview = async (req, res) => {
    try {
        // Pegar slug pelo subdomínio ou parâmetro
        let { slug } = req.params;
        
        if (!slug) {
            // Tentar pegar pelo subdomínio
            const hostname = req.hostname;
            const parts = hostname.split('.');
            // Pega a primeira parte do hostname (subdomínio)
            if (parts.length >= 3) {
                slug = parts[0].toLowerCase();
            }
        }

        if (!slug) {
            return res.status(400).send('Slug não fornecido');
        }

        // Buscar dados da loja
        const restaurant = await prisma.restaurant.findUnique({
            where: { slug: slug.toLowerCase() },
            select: {
                name: true,
                logoUrl: true,
                address: true,
                phone: true,
                city: true,
                state: true,
                openingHours: true,
                description: true,
                settings: {
                    select: {
                        deliveryTime: true,
                        minOrderValue: true
                    }
                }
            }
        });

        if (!restaurant) {
            return res.status(404).send('Loja não encontrada');
        }

        // Determinar URL base dinâmica baseada no Host do request
        const protocol = req.protocol;
        const hostname = req.hostname;
        const baseUrl = `${protocol}://${hostname}`;
        
        const logoUrl = restaurant.logoUrl 
            ? (restaurant.logoUrl.startsWith('http') ? restaurant.logoUrl : `${baseUrl}${restaurant.logoUrl}`)
            : `${baseUrl}/logo.png`;

        // Criar descrição dinâmica - usa description do DB ou deriva do endereço
        let description = restaurant.description || '';
        
        if (!description) {
            const descriptionParts = [];
            if (restaurant.address) descriptionParts.push(restaurant.address);
            if (restaurant.city) descriptionParts.push(restaurant.city, restaurant.state);
            if (restaurant.openingHours) descriptionParts.push(`Horário: ${restaurant.openingHours}`);
            if (restaurant.settings?.minOrderValue) descriptionParts.push(`Pedido mínimo: R$ ${restaurant.settings.minOrderValue.toFixed(2)}`);
            
            description = descriptionParts.length > 0 
                ? descriptionParts.join(' • ')
                : 'Peça online agora mesmo no melhor cardápio digital da região!';
        }

        // Gerar HTML com meta tags dinâmicas para bots (WhatsApp, Facebook, etc)
        // IMPORTANTE: Este HTML é renderizado pelo servidor, sem JavaScript
        const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${restaurant.name} | Cardápio Digital</title>
    
    <!-- Meta Tags Padrão -->
    <meta name="description" content="${description}">
    
    <!-- Open Graph / Facebook / WhatsApp - Preview Cards -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="${baseUrl}">
    <meta property="og:title" content="${restaurant.name} - Peça Online">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${logoUrl}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:site_name" content="${restaurant.name}">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:url" content="${baseUrl}">
    <meta name="twitter:title" content="${restaurant.name} - Peça Online">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${logoUrl}">
    
    <!-- Favicon -->
    <link rel="icon" type="image/png" href="${logoUrl}">
    
    <!-- WhatsApp specific -->
    <meta property="wa:card" content="summary_large_image">
    <meta property="wa:title" content="${restaurant.name} - Peça Online">
    <meta property="wa:description" content="${description}">
    <meta property="wa:image" content="${logoUrl}">
    
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        .container { max-width: 500px; text-align: center; padding: 40px; background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .logo { width: 120px; height: 120px; border-radius: 50%; object-fit: cover; margin-bottom: 20px; }
        .title { font-size: 28px; font-weight: bold; color: #333; margin: 0 0 10px 0; }
        .description { color: #666; font-size: 16px; margin-bottom: 20px; }
        .button { display: inline-block; background: #d4af37; color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 18px; }
        .button:hover { background: #b8962e; }
        .info { margin-top: 20px; font-size: 14px; color: #999; }
    </style>
</head>
<body>
    <div class="container">
        <img src="${logoUrl}" alt="${restaurant.name}" class="logo">
        <h1 class="title">${restaurant.name}</h1>
        <p class="description">${description}</p>
        <a href="${baseUrl}" class="button">Ver Cardápio</a>
        <p class="info">Direcionando para o cardápio...</p>
        <script>
            setTimeout(function() {
                window.location.href = "${baseUrl}";
            }, 2000);
        </script>
    </div>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
    } catch (error) {
        logger.error('Erro ao gerar preview:', error);
        res.status(500).send('Erro ao carregar informações da loja');
    }
};

module.exports = {
    getRestaurantPreview
};