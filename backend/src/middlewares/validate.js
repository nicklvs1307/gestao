/**
 * Middleware de Validação de Esquema
 * Bloqueia a requisição antes de chegar ao Controller se os dados estiverem errados.
 */
const validate = (schema) => (req, res, next) => {
    try {
        // Se estiver usando Zod: schema.parse(req.body)
        // Se estiver usando Joi: const { error } = schema.validate(req.body)
        
        // Exemplo simplificado de lógica de validação:
        const { error } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
        
        if (error) {
            const errorMessage = error.details.map(d => d.message).join(', ');
            return res.status(400).json({ error: `Dados inválidos: ${errorMessage}` });
        }
        
        next();
    } catch (err) {
        res.status(500).json({ error: 'Erro interno na validação de dados.' });
    }
};

module.exports = validate;
