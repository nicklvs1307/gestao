/**
 * Interface abstrata para provedores de emissão fiscal.
 * Implementações: FocusNFeProvider, WebmaniaProvider
 */
class FiscalProvider {
    /**
     * @param {Object} config - Configuração do provedor (certificate, cnpj, etc.)
     */
    constructor(config) {
        this.config = config;
    }

    /**
     * Assina e envia o XML para a SEFAZ.
     * @param {string} xml - XML assinado
     * @param {Object} options - { environment: 'production'|'homologation' }
     * @returns {Promise<{success: boolean, accessKey?: string, protocol?: string, receipt?: string, error?: string, status?: string, codes?: Object}>}
     */
    async send(xml, options = {}) {
        throw new Error('send() must be implemented by provider');
    }

    /**
     * Consulta o recibo de envio.
     * @param {string} receipt
     * @returns {Promise<{success: boolean, status?: string, accessKey?: string, protocol?: string, error?: string, codes?: Object}>}
     */
    async queryReceipt(receipt) {
        throw new Error('queryReceipt() must be implemented by provider');
    }

    /**
     * Envia evento de cancelamento (110110).
     * @param {Object} params - { accessKey, protocol, reason, timestamp }
     * @returns {Promise<{success: boolean, protocol?: string, error?: string}>}
     */
    async cancelEvent(params) {
        throw new Error('cancelEvent() must be implemented by provider');
    }

    /**
     * Envia evento de carta de correção (110110).
     * @param {Object} params - { accessKey, protocol, sequence, corrections }
     * @returns {Promise<{success: boolean, protocol?: string, error?: string}>}
     */
    async correctionLetterEvent(params) {
        throw new Error('correctionLetterEvent() must be implemented by provider');
    }

    /**
     * Envia inutilização de numeração.
     * @param {Object} params - { nNFInicio, nNFFim, reason, cnpj, uf }
     * @returns {Promise<{success: boolean, protocol?: string, error?: string}>}
     */
    async inutilizationEvent(params) {
        throw new Error('inutilizationEvent() must be implemented by provider');
    }

    /**
     * Retorna o status do provedor.
     * @returns {Promise<{online: boolean, provider: string, environment: string}>}
     */
    async status() {
        throw new Error('status() must be implemented by provider');
    }
}

module.exports = FiscalProvider;
