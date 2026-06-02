const FocusNFeProvider = require('./FocusNFeProvider');
const WebmaniaProvider = require('./WebmaniaProvider');
const { logger } = require('../../utils/logger');

/**
 * Factory para criar o provedor fiscal correto baseado na configuração.
 * @param {Object} fiscalConfig - Configuração fiscal do restaurante
 * @returns {FiscalProvider}
 */
function createFiscalProvider(fiscalConfig) {
    const provider = fiscalConfig.provider || 'focus';
    const environment = fiscalConfig.environment || 'homologation';

    const config = {
        ...fiscalConfig,
        environment
    };

    switch (provider) {
        case 'webmania':
            if (!config.clientId || !config.clientSecret) {
                logger.warn('[FiscalProvider] Webmania configurado sem clientId/clientSecret');
            }
            return new WebmaniaProvider(config);

        case 'focus':
        default:
            if (!config.token) {
                logger.warn('[FiscalProvider] Focus NFe configurado sem token');
            }
            return new FocusNFeProvider(config);
    }
}

module.exports = { createFiscalProvider };
