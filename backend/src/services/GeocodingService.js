const axios = require('axios');
const logger = require('../config/logger');

class GeocodingService {
    async getCoordinates(address, restaurantId = null) {
        if (!address || address === 'Retirada no Balcão') return null;
        
        // 1. Limpeza e Normalização
        let searchAddress = address.replace(/\/+$/, '').trim();
        
        // Se temos restaurantId, podemos tentar enriquecer o endereço sem duplicar
        if (restaurantId) {
            try {
                const prisma = require('../lib/prisma');
                const restaurant = await prisma.restaurant.findUnique({
                    where: { id: restaurantId },
                    select: { city: true, state: true }
                });
                
                if (restaurant?.city && !searchAddress.toLowerCase().includes(restaurant.city.toLowerCase())) {
                    searchAddress += `, ${restaurant.city}`;
                }
                if (restaurant?.state && !searchAddress.toLowerCase().includes(restaurant.state.toLowerCase())) {
                    searchAddress += ` - ${restaurant.state}`;
                }
            } catch (e) {
                logger.warn("[GEOCODE] Falha ao buscar contexto do restaurante.");
            }
        }

        const apiKey = process.env.VITE_OPENROUTE_KEY || process.env.OPENROUTE_KEY;
        logger.info(`[GEOCODE DEBUG] Chave ORS presente: ${apiKey ? 'SIM' : 'NÃO'}`);

        // 2. Tentar OpenRouteService (se tiver chave)
        if (apiKey) {
            try {
                logger.info(`[GEOCODE] Tentando ORS: ${searchAddress}`);
                const url = `https://api.openrouteservice.org/geocode/search?api_key=${apiKey}&text=${encodeURIComponent(searchAddress)}&boundary.country=BR&size=1`;
                const response = await axios.get(url, { timeout: 5000 });
                
                if (response.data.features && response.data.features.length > 0) {
                    const [lng, lat] = response.data.features[0].geometry.coordinates;
                    logger.info(`[GEOCODE] Sucesso ORS: ${lat}, ${lng}`);
                    return { lat, lng };
                } else {
                    logger.info(`[GEOCODE] ORS retornou zero resultados para: ${searchAddress}`);
                }
            } catch (error) {
                logger.warn(`[GEOCODE WARNING] Falha no ORS (${error.message}). Tentando fallback...`);
            }
        }

        // 3. Fallback para Nominatim (OSM)
        try {
            logger.info(`[GEOCODE] Tentando Fallback OSM: ${searchAddress}`);
            const osmUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchAddress)}&format=json&limit=1&countrycodes=br`;
            const response = await axios.get(osmUrl, { 
                headers: { 'User-Agent': 'Kicardapio-Smart-Delivery' },
                timeout: 5000 
            });

            if (response.data && response.data.length > 0) {
                const lat = parseFloat(response.data[0].lat);
                const lng = parseFloat(response.data[0].lon);
                logger.info(`[GEOCODE] Sucesso OSM: ${lat}, ${lng}`);
                return { lat, lng };
            } else {
                logger.info(`[GEOCODE] OSM retornou zero resultados para: ${searchAddress}`);
            }
        } catch (error) {
            logger.error(`[GEOCODE ERROR] Falha total ao localizar: ${searchAddress}`, error.message);
        }
        
        return null;
    }
}

module.exports = new GeocodingService();
