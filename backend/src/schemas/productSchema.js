/**
 * Esquema de Validação para Produtos (Whitelist)
 * Define quais campos são permitidos e seus tipos básicos.
 */
const productSchema = {
    validate: (data) => {
        const allowedFields = [
            'name', 'description', 'price', 'imageUrl', 'isFeatured', 
            'isAvailable', 'stock', 'categoryId', 'categoryIds', 'productionArea',
            'saiposIntegrationCode', 'ncm', 'cfop', 'cest', 'measureUnit', 
            'origin', 'taxPercentage', 'pizzaConfig', 'sizes', 'addonGroups', 'ingredients'
        ];

        const errors = [];
        const validatedData = {};

        // 1. Verificação de Campos Obrigatórios
        if (!data.name) errors.push({ message: 'O nome do produto é obrigatório.' });
        if (data.price === undefined) errors.push({ message: 'O preço é obrigatório.' });
        
        // Suporta tanto o modelo antigo (categoryId) quanto o novo (categoryIds)
        if (!data.categoryId && (!data.categoryIds || data.categoryIds.length === 0)) {
            errors.push({ message: 'Pelo menos uma categoria é obrigatória.' });
        }

        if (errors.length > 0) return { error: { details: errors } };

        // 2. Whitelist e Sanitização Básica
        allowedFields.forEach(field => {
            if (data[field] !== undefined) {
                validatedData[field] = data[field];
            }
        });

        // 3. Validação de Tipos Específicos
        if (typeof validatedData.price !== 'number') {
            validatedData.price = parseFloat(validatedData.price);
        }

        return { value: validatedData };
    }
};

module.exports = productSchema;
