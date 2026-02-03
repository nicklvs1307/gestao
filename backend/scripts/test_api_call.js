const axios = require('axios');

async function testApi() {
    const restaurantId = 'clgq0v1y00000t3d8b4e6f2g1';
    const url = `http://localhost:3001/api/client/promotions/active/${restaurantId}`;
    
    console.log(`Testando URL: ${url}`);
    
    try {
        const response = await axios.get(url);
        console.log("Status:", response.status);
        console.log("Dados recebidos (Length):", response.data.length);
        console.log("Amostra:", JSON.stringify(response.data[0], null, 2));
    } catch (error) {
        console.error("Erro na requisição:", error.message);
        if (error.response) {
            console.error("Status Erro:", error.response.status);
            console.error("Data Erro:", error.response.data);
        }
    }
}

testApi();