const FiscalProvider = require('./FiscalProvider');
const axios = require('axios');
const { logger } = require('../../utils/logger');

const PRODUCTION_URL = 'https://api.webmaniabr.com/nfe/v2';
const HOMOLOGATION_URL = 'https://homologacao.nfe.webmaniabr.com/nfe/v2';

class WebmaniaProvider extends FiscalProvider {
    constructor(config) {
        super(config);
        this.baseURL = config.environment === 'production' ? PRODUCTION_URL : HOMOLOGATION_URL;
    }

    _headers() {
        return {
            'x-client-id': this.config.clientId,
            'x-client-secret': this.config.clientSecret,
            'Content-Type': 'application/xml',
            Accept: 'application/json'
        };
    }

    async send(xml, options = {}) {
        try {
            const url = `${this.baseURL}/emissao`;
            const response = await axios.post(url, xml, {
                headers: this._headers(),
                timeout: 30000
            });

            if (response.data?.status === 'success') {
                return {
                    success: true,
                    receipt: response.data.recibo,
                    status: 'PROCESSING'
                };
            }

            return {
                success: false,
                error: response.data?.message || 'Erro desconhecido da Webmania',
                status: 'REJECTED',
                codes: { cStat: response.data?.status, xMotivo: response.data?.message }
            };
        } catch (error) {
            logger.error('[Webmania] Erro ao enviar:', error.message);
            return {
                success: false,
                error: error.response?.data?.message || error.message,
                status: 'REJECTED'
            };
        }
    }

    async queryReceipt(receipt) {
        try {
            const url = `${this.baseURL}/consulta/${receipt}`;
            const response = await axios.get(url, { headers: this._headers(), timeout: 15000 });

            const data = response.data;
            if (data.status === 'success' && data.nfe) {
                return {
                    success: true,
                    status: 'AUTHORIZED',
                    accessKey: data.nfe.chave_acesso,
                    protocol: data.nfe.numero_protocolo,
                    codes: { cStat: '100', xMotivo: 'Autorizado o uso da NF-e' }
                };
            }

            if (data.status === 'pending') {
                return { success: false, status: 'PENDING', error: 'Processando na SEFAZ' };
            }

            return {
                success: false,
                status: 'REJECTED',
                error: data.message || 'Nota rejeitada',
                codes: { cStat: data.status, xMotivo: data.message }
            };
        } catch (error) {
            logger.error('[Webmania] Erro ao consultar:', error.message);
            return { success: false, status: 'REJECTED', error: error.message };
        }
    }

    async cancelEvent({ accessKey, protocol, reason, cnpj, timestamp }) {
        try {
            const xml = this._buildCancelXml(accessKey, protocol, reason, cnpj, timestamp);
            const url = `${this.baseURL}/evento/cancelamento`;
            const response = await axios.post(url, xml, { headers: this._headers(), timeout: 30000 });

            if (response.data?.status === 'success') {
                return { success: true, protocol: response.data.numero_protocolo };
            }
            return { success: false, error: response.data?.message || 'Erro ao cancelar' };
        } catch (error) {
            logger.error('[Webmania] Erro cancelamento:', error.message);
            return { success: false, error: error.message };
        }
    }

    async correctionLetterEvent({ accessKey, protocol, sequence, corrections, cnpj, timestamp }) {
        try {
            const xml = this._buildCorrectionXml(accessKey, protocol, sequence, corrections, cnpj, timestamp);
            const url = `${this.baseURL}/evento/carta-correcao`;
            const response = await axios.post(url, xml, { headers: this._headers(), timeout: 30000 });

            if (response.data?.status === 'success') {
                return { success: true, protocol: response.data.numero_protocolo };
            }
            return { success: false, error: response.data?.message || 'Erro na carta de correção' };
        } catch (error) {
            logger.error('[Webmania] Erro carta correção:', error.message);
            return { success: false, error: error.message };
        }
    }

    async inutilizationEvent({ nNFInicio, nNFFim, reason, cnpj, uf }) {
        try {
            const xml = this._buildInutilizationXml(nNFInicio, nNFFim, reason, cnpj, uf);
            const url = `${this.baseURL}/evento/inutilizacao`;
            const response = await axios.post(url, xml, { headers: this._headers(), timeout: 30000 });

            if (response.data?.status === 'success') {
                return { success: true, protocol: response.data.numero_protocolo };
            }
            return { success: false, error: response.data?.message || 'Erro na inutilização' };
        } catch (error) {
            logger.error('[Webmania] Erro inutilização:', error.message);
            return { success: false, error: error.message };
        }
    }

    async status() {
        try {
            const url = `${this.baseURL}/status`;
            const response = await axios.get(url, { headers: this._headers(), timeout: 10000 });
            return { online: response.status === 200, provider: 'webmania', environment: this.config.environment };
        } catch (error) {
            return { online: false, provider: 'webmania', environment: this.config.environment };
        }
    }

    _buildCancelXml(accessKey, protocol, reason, cnpj, timestamp) {
        return `<?xml version="1.0" encoding="UTF-8"?>
<eventoNFe xmlns="http://www.portalfiscal.inf.br/nfe">
    <infEvento>
        <chNFe>${accessKey}</chNFe>
        <cOrgao>91</cOrgao>
        <tpAmb>${this.config.environment === 'production' ? '1' : '2'}</tpAmb>
        <xServ>CANCELAR</xServ>
        <cnf>${this._generateCnf()}</cnf>
        <tpEvento>110110</tpEvento>
        <nSeqEvento>1</nSeqEvento>
        <dhEvento>${timestamp}</dhEvento>
        <detEvento>
            <descEvento>Cancelamento</descEvento>
            <nProt>${protocol}</nProt>
            <xJust>${this._escapeXml(reason)}</xJust>
        </detEvento>
    </infEvento>
</eventoNFe>`;
    }

    _buildCorrectionXml(accessKey, protocol, sequence, corrections, cnpj, timestamp) {
        return `<?xml version="1.0" encoding="UTF-8"?>
<eventoNFe xmlns="http://www.portalfiscal.inf.br/nfe">
    <infEvento>
        <chNFe>${accessKey}</chNFe>
        <cOrgao>91</cOrgao>
        <tpAmb>${this.config.environment === 'production' ? '1' : '2'}</tpAmb>
        <xServ>CORRIGIR</xServ>
        <cnf>${this._generateCnf()}</cnf>
        <tpEvento>110110</tpEvento>
        <nSeqEvento>${sequence}</nSeqEvento>
        <dhEvento>${timestamp}</dhEvento>
        <detEvento>
            <descEvento>Carta de Correcao</descEvento>
            <xCorrecao>${this._escapeXml(corrections)}</xCorrecao>
            <xCondUso>A Carta de Correcao e disciplinada pelo Art. 58-B do Decreto 7.212/2010 e serve para: Corrigir erros ocorridos na emissao do documento fiscal sem que para isso necessite de cancelamento da nota de origem.</xCondUso>
        </detEvento>
    </infEvento>
</eventoNFe>`;
    }

    _buildInutilizationXml(nNFInicio, nNFFim, reason, cnpj, uf) {
        return `<?xml version="1.0" encoding="UTF-8"?>
<inutNFe xmlns="http://www.portalfiscal.inf.br/nfe">
    <infInut>
        <tpAmb>${this.config.environment === 'production' ? '1' : '2'}</tpAmb>
        <xServ>INUTILIZAR</xServ>
        <cUF>${this._getUfCode(uf)}</cUF>
        <ano>${new Date().getFullYear().toString().slice(2)}</ano>
        <CNPJ>${cnpj.replace(/\D/g, '')}</CNPJ>
        <nNFIni>${nNFInicio}</nNFIni>
        <nNFFin>${nNFFim}</nNFFin>
        <xJust>${this._escapeXml(reason)}</xJust>
    </infInut>
</inutNFe>`;
    }

    _generateCnf() {
        return Math.floor(10000000 + Math.random() * 89999999).toString();
    }

    _escapeXml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
    }

    _getUfCode(uf) {
        const codes = {
            'MG': '31', 'SP': '35', 'RJ': '33', 'PR': '41', 'BA': '29',
            'GO': '52', 'AM': '13', 'MS': '50', 'MT': '51', 'PE': '26',
            'RS': '43', 'CE': '23', 'PA': '15', 'SC': '42', 'ES': '32',
            'PI': '22', 'RN': '24', 'PB': '25', 'AL': '27', 'SE': '28',
            'TO': '17', 'RO': '11', 'AC': '12', 'AP': '16', 'RR': '14',
            'DF': '53', 'MA': '21'
        };
        return codes[uf] || '31';
    }
}

module.exports = WebmaniaProvider;
