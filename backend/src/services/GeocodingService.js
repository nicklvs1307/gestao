const axios = require('axios');

class GeocodingService {
    async getCoordinates(address) {
        if (!address || address === 'Retirada no Balcão') return null;
        
        // Limpeza básica do endereço
        const cleanAddress = address.replace(/\/+$/, '').trim();
        const apiKey = process.env.VITE_OPENROUTE_KEY || process.env.OPENROUTE_KEY;

        // 1. Tentar OpenRouteService (se tiver chave)
        if (apiKey) {
            try {
                console.log(`[GEOCODE] Tentando ORS: ${cleanAddress}`);
                const url = `https://api.openrouteservice.org/geocode/search?api_key=${apiKey}&text=${encodeURIComponent(cleanAddress)}&boundary.country=BR&size=1`;
                const response = await axios.get(url, { timeout: 5000 });
                
                if (response.data.features && response.data.features.length > 0) {
                    const [lng, lat] = response.data.features[0].geometry.coordinates;
                    console.log(`[GEOCODE] Sucesso ORS: ${lat}, ${lng}`);
                    return { lat, lng };
                }
            } catch (error) {
                console.warn(`[GEOCODE WARNING] Falha no ORS: ${error.message}. Tentando fallback...`);
            }
        }

        // 2. Fallback para Nominatim (OSM)
        try {
            console.log(`[GEOCODE] Tentando Fallback OSM: ${cleanAddress}`);
            const osmUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanAddress)}&format=json&limit=1&countrycodes=br`;
            const response = await axios.get(osmUrl, { 
                headers: { 'User-Agent': 'Kicardapio-Smart-Delivery' },
                timeout: 5000 
            });

            if (response.data && response.data.length > 0) {
                const lat = parseFloat(response.data[0].lat);
                const lng = parseFloat(response.data[0].lon);
                console.log(`[GEOCODE] Sucesso OSM: ${lat}, ${lng}`);
                return { lat, lng };
            }
        } catch (error) {
            console.error(`[GEOCODE ERROR] Falha total ao localizar: ${cleanAddress}`, error.message);
        }
        
        return null;
    }
}

module.exports = new GeocodingService();
