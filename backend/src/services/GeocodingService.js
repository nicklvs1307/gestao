const axios = require('axios');

class GeocodingService {
    async getCoordinates(address) {
        const apiKey = process.env.VITE_OPENROUTE_KEY || process.env.OPENROUTE_KEY;
        if (!apiKey || !address) return null;

        try {
            const url = `https://api.openrouteservice.org/geocode/search?api_key=${apiKey}&text=${encodeURIComponent(address)}&boundary.country=BR&size=1`;
            const response = await axios.get(url);
            
            if (response.data.features && response.data.features.length > 0) {
                const [lng, lat] = response.data.features[0].geometry.coordinates;
                return { lat, lng };
            }
        } catch (error) {
            console.error(`[GEOCODE ERROR] Fail to locate: ${address}`, error.message);
        }
        return null;
    }
}

module.exports = new GeocodingService();
