const forge = require('node-forge');
const logger = require('../config/logger');
const { SignedXml } = require('xml-crypto');
const axios = require('axios');
const https = require('https');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');
const crypto = require('crypto');
const { createHash } = crypto;

class FiscalService {
    constructor() {
        this.parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
        this.builder = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: "@_" });

        // Rate limiting: rejeições por CNPJ
        this.rejectionCounters = new Map(); // cnpj -> { count, firstRejectionAt }
        this.REJECTION_THRESHOLD = 150;
        this.REJECTION_WINDOW_MS = 60 * 60 * 1000; // 1 hora

        // Endereços SEFAZ - Todos os estados (NFC-e 4.00)
        this.endpoints = {
            // SEFAZ Próprias
            'MG': {
                autorizacao: { homologation: 'https://hnfce.fazenda.mg.gov.br/nfce/services/NFeAutorizacao4', production: 'https://nfce.fazenda.mg.gov.br/nfce/services/NFeAutorizacao4' },
                inutilizacao: { homologation: 'https://hnfce.fazenda.mg.gov.br/nfce/services/NFeInutilizacao4', production: 'https://nfce.fazenda.mg.gov.br/nfce/services/NFeInutilizacao4' },
                cancelamento: { homologation: 'https://hnfce.fazenda.mg.gov.br/nfce/services/NFeRecepcaoEvento4', production: 'https://nfce.fazenda.mg.gov.br/nfce/services/NFeRecepcaoEvento4' },
                cartaCorrecao: { homologation: 'https://hnfce.fazenda.mg.gov.br/nfce/services/NFeRecepcaoEvento4', production: 'https://nfce.fazenda.mg.gov.br/nfce/services/NFeRecepcaoEvento4' },
                qrCode: { homologation: 'https://hnfce.fazenda.mg.gov.br/portalfiscalnfce/view/consulta/consulta.xhtml', production: 'https://nfce.fazenda.mg.gov.br/portalfiscalnfce/view/consulta/consulta.xhtml' },
                svc: 'SVC-AN'
            },
            'SP': {
                autorizacao: { homologation: 'https://homologacao.nfce.fazenda.sp.gov.br/ws/nfceautorizacao4.asmx', production: 'https://nfce.fazenda.sp.gov.br/ws/nfceautorizacao4.asmx' },
                inutilizacao: { homologation: 'https://homologacao.nfce.fazenda.sp.gov.br/ws/nfeinutilizacao4.asmx', production: 'https://nfce.fazenda.sp.gov.br/ws/nfeinutilizacao4.asmx' },
                cancelamento: { homologation: 'https://homologacao.nfce.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx', production: 'https://nfce.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx' },
                cartaCorrecao: { homologation: 'https://homologacao.nfce.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx', production: 'https://nfce.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx' },
                qrCode: { homologation: 'https://www.homologacao.nfce.fazenda.sp.gov.br/consulta', production: 'https://www.nfce.fazenda.sp.gov.br/consulta' },
                svc: 'SVC-AN'
            },
            'PR': {
                autorizacao: { homologation: 'https://homologacao.nfce.sefa.pr.gov.br/nfce/NFeAutorizacao4', production: 'https://nfe.sefa.pr.gov.br/nfce/NFeAutorizacao4' },
                inutilizacao: { homologation: 'https://homologacao.nfce.sefa.pr.gov.br/nfce/NFeInutilizacao4', production: 'https://nfe.sefa.pr.gov.br/nfce/NFeInutilizacao4' },
                cancelamento: { homologation: 'https://homologacao.nfce.sefa.pr.gov.br/nfce/NFeRecepcaoEvento4', production: 'https://nfe.sefa.pr.gov.br/nfce/NFeRecepcaoEvento4' },
                cartaCorrecao: { homologation: 'https://homologacao.nfce.sefa.pr.gov.br/nfce/NFeRecepcaoEvento4', production: 'https://nfe.sefa.pr.gov.br/nfce/NFeRecepcaoEvento4' },
                qrCode: { homologation: 'https://www.nfce.sefa.pr.gov.br/nfce/consultaNFCe', production: 'https://www.nfce.sefa.pr.gov.br/nfce/consultaNFCe' },
                svc: 'SVC-RS'
            },
            'BA': {
                autorizacao: { homologation: 'https://hnfe.sefaz.ba.gov.br/webservices/NFeAutorizacao4/NFeAutorizacao4', production: 'https://nfe.sefaz.ba.gov.br/webservices/NFeAutorizacao4/NFeAutorizacao4' },
                inutilizacao: { homologation: 'https://hnfe.sefaz.ba.gov.br/webservices/NFeInutilizacao4/NFeInutilizacao4', production: 'https://nfe.sefaz.ba.gov.br/webservices/NFeInutilizacao4/NFeInutilizacao4' },
                cancelamento: { homologation: 'https://hnfe.sefaz.ba.gov.br/webservices/NFeRecepcaoEvento4/NFeRecepcaoEvento4', production: 'https://nfe.sefaz.ba.gov.br/webservices/NFeRecepcaoEvento4/NFeRecepcaoEvento4' },
                cartaCorrecao: { homologation: 'https://hnfe.sefaz.ba.gov.br/webservices/NFeRecepcaoEvento4/NFeRecepcaoEvento4', production: 'https://nfe.sefaz.ba.gov.br/webservices/NFeRecepcaoEvento4/NFeRecepcaoEvento4' },
                qrCode: { homologation: 'https://hnfe.sefaz.ba.gov.br/portalfiscal/consultanfce/consultanfce.aspx', production: 'https://nfe.sefaz.ba.gov.br/portalfiscal/consultanfce/consultanfce.aspx' },
                svc: 'SVC-RS'
            },
            'GO': {
                autorizacao: { homologation: 'https://homolog.sefaz.go.gov.br/nfe/services/NFeAutorizacao4', production: 'https://nfe.sefaz.go.gov.br/nfe/services/NFeAutorizacao4' },
                inutilizacao: { homologation: 'https://homolog.sefaz.go.gov.br/nfe/services/NFeInutilizacao4', production: 'https://nfe.sefaz.go.gov.br/nfe/services/NFeInutilizacao4' },
                cancelamento: { homologation: 'https://homolog.sefaz.go.gov.br/nfe/services/NFeRecepcaoEvento4', production: 'https://nfe.sefaz.go.gov.br/nfe/services/NFeRecepcaoEvento4' },
                cartaCorrecao: { homologation: 'https://homolog.sefaz.go.gov.br/nfe/services/NFeRecepcaoEvento4', production: 'https://nfe.sefaz.go.gov.br/nfe/services/NFeRecepcaoEvento4' },
                qrCode: { homologation: 'https://homolog.sefaz.go.gov.br/nfce/portalfiscal/consultaNFCe', production: 'https://nfe.sefaz.go.gov.br/nfce/portalfiscal/consultaNFCe' },
                svc: 'SVC-RS'
            },
            'AM': {
                autorizacao: { homologation: 'https://homologacao.nfce.am.gov.br/services2/services/NfeAutorizacao4', production: 'https://nfce.am.gov.br/services2/services/NfeAutorizacao4' },
                inutilizacao: { homologation: 'https://homologacao.nfce.am.gov.br/services2/services/NfeInutilizacao4', production: 'https://nfce.am.gov.br/services2/services/NfeInutilizacao4' },
                cancelamento: { homologation: 'https://homologacao.nfce.am.gov.br/services2/services/NfeRecepcaoEvento4', production: 'https://nfce.am.gov.br/services2/services/NfeRecepcaoEvento4' },
                cartaCorrecao: { homologation: 'https://homologacao.nfce.am.gov.br/services2/services/NfeRecepcaoEvento4', production: 'https://nfce.am.gov.br/services2/services/NfeRecepcaoEvento4' },
                qrCode: { homologation: 'https://sistemas.am.gov.br/nfce/homologacao/pr/consultaNFCe', production: 'https://sistemas.am.gov.br/nfce/consultaNFCe' },
                svc: 'SVC-RS'
            },
            'MS': {
                autorizacao: { homologation: 'https://homologacao.nfce.sefaz.ms.gov.br/ws/NFeAutorizacao4', production: 'https://nfe.sefaz.ms.gov.br/ws/NFeAutorizacao4' },
                inutilizacao: { homologation: 'https://homologacao.nfce.sefaz.ms.gov.br/ws/NFeInutilizacao4', production: 'https://nfe.sefaz.ms.gov.br/ws/NFeInutilizacao4' },
                cancelamento: { homologation: 'https://homologacao.nfce.sefaz.ms.gov.br/ws/NFeRecepcaoEvento4', production: 'https://nfe.sefaz.ms.gov.br/ws/NFeRecepcaoEvento4' },
                cartaCorrecao: { homologation: 'https://homologacao.nfce.sefaz.ms.gov.br/ws/NFeRecepcaoEvento4', production: 'https://nfe.sefaz.ms.gov.br/ws/NFeRecepcaoEvento4' },
                qrCode: { homologation: 'https://www.sefaz.ms.gov.br/nfce/consultaNFCe', production: 'https://www.sefaz.ms.gov.br/nfce/consultaNFCe' },
                svc: 'SVC-RS'
            },
            'MT': {
                autorizacao: { homologation: 'https://homologacao.sefaz.mt.gov.br/nfews/v2/services/NfeAutorizacao4', production: 'https://nfe.sefaz.mt.gov.br/nfews/v2/services/NfeAutorizacao4' },
                inutilizacao: { homologation: 'https://homologacao.sefaz.mt.gov.br/nfews/v2/services/NfeInutilizacao4', production: 'https://nfe.sefaz.mt.gov.br/nfews/v2/services/NfeInutilizacao4' },
                cancelamento: { homologation: 'https://homologacao.sefaz.mt.gov.br/nfews/v2/services/NfeRecepcaoEvento4', production: 'https://nfe.sefaz.mt.gov.br/nfews/v2/services/NfeRecepcaoEvento4' },
                cartaCorrecao: { homologation: 'https://homologacao.sefaz.mt.gov.br/nfews/v2/services/NfeRecepcaoEvento4', production: 'https://nfe.sefaz.mt.gov.br/nfews/v2/services/NfeRecepcaoEvento4' },
                qrCode: { homologation: 'https://www.sefaz.mt.gov.br/nfce/consultaNFCe', production: 'https://www.sefaz.mt.gov.br/nfce/consultaNFCe' },
                svc: 'SVC-RS'
            },
            'PE': {
                autorizacao: { homologation: 'https://nfce-homologacao.sefaz.pe.gov.br/nfce-services/services/NFeAutorizacao4', production: 'https://nfce.sefaz.pe.gov.br/nfce-services/services/NFeAutorizacao4' },
                inutilizacao: { homologation: 'https://nfce-homologacao.sefaz.pe.gov.br/nfce-services/services/NFeInutilizacao4', production: 'https://nfce.sefaz.pe.gov.br/nfce-services/services/NFeInutilizacao4' },
                cancelamento: { homologation: 'https://nfce-homologacao.sefaz.pe.gov.br/nfce-services/services/NFeRecepcaoEvento4', production: 'https://nfce.sefaz.pe.gov.br/nfce-services/services/NFeRecepcaoEvento4' },
                cartaCorrecao: { homologation: 'https://nfce-homologacao.sefaz.pe.gov.br/nfce-services/services/NFeRecepcaoEvento4', production: 'https://nfce.sefaz.pe.gov.br/nfce-services/services/NFeRecepcaoEvento4' },
                qrCode: { homologation: 'https://www.sefaz.pe.gov.br/nfce/consultaNFCe', production: 'https://www.sefaz.pe.gov.br/nfce/consultaNFCe' },
                svc: 'SVC-RS'
            },
            'RS': {
                autorizacao: { homologation: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx', production: 'https://nfe.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx' },
                inutilizacao: { homologation: 'https://nfe-homologacao.svrs.rs.gov.br/ws/nfeinutilizacao/nfeinutilizacao4.asmx', production: 'https://nfe.svrs.rs.gov.br/ws/nfeinutilizacao/nfeinutilizacao4.asmx' },
                cancelamento: { homologation: 'https://nfe-homologacao.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx', production: 'https://nfe.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx' },
                cartaCorrecao: { homologation: 'https://nfe-homologacao.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx', production: 'https://nfe.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx' },
                qrCode: { homologation: 'https://www.sefaz.rs.gov.br/GR/NFCE/NFCE-COM.aspx', production: 'https://www.sefaz.rs.gov.br/GR/NFCE/NFCE-COM.aspx' },
                svc: 'SVC-AN'
            },
            // SVRS (Sefaz Virtual do Rio Grande do Sul) - para estados sem SEFAZ própria
            'SVRS': {
                autorizacao: { homologation: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx', production: 'https://nfe.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx' },
                inutilizacao: { homologation: 'https://nfe-homologacao.svrs.rs.gov.br/ws/nfeinutilizacao/nfeinutilizacao4.asmx', production: 'https://nfe.svrs.rs.gov.br/ws/nfeinutilizacao/nfeinutilizacao4.asmx' },
                cancelamento: { homologation: 'https://nfe-homologacao.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx', production: 'https://nfe.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx' },
                cartaCorrecao: { homologation: 'https://nfe-homologacao.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx', production: 'https://nfe.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx' },
                qrCode: { homologation: 'https://www.sefaz.rs.gov.br/GR/NFCE/NFCE-COM.aspx', production: 'https://www.sefaz.rs.gov.br/GR/NFCE/NFCE-COM.aspx' },
                svc: 'SVC-AN'
            },
            // SVC-AN (Sefaz Virtual de Contingência - Ambiente Nacional)
            'SVC-AN': {
                autorizacao: { homologation: 'https://svc-anc.nfe.fazenda.gov.br/NfeAutorizacao4', production: 'https://svc-anc.nfe.fazenda.gov.br/NfeAutorizacao4' },
                cancelamento: { homologation: 'https://svc-anc.nfe.fazenda.gov.br/NFeRecepcaoEvento4', production: 'https://svc-anc.nfe.fazenda.gov.br/NFeRecepcaoEvento4' }
            },
            // SVC-RS (Sefaz Virtual de Contingência - Rio Grande do Sul)
            'SVC-RS': {
                autorizacao: { homologation: 'https://svc-rs.nfe.fazenda.gov.br/NfeAutorizacao4', production: 'https://svc-rs.nfe.fazenda.gov.br/NfeAutorizacao4' },
                cancelamento: { homologation: 'https://svc-rs.nfe.fazenda.gov.br/NFeRecepcaoEvento4', production: 'https://svc-rs.nfe.fazenda.gov.br/NFeRecepcaoEvento4' }
            }
        };

        // Mapeamento de UF -> SEFAZ utilizada (própria ou virtual)
        this.ufToSefaz = {
            'AC': 'SVRS', 'AL': 'SVRS', 'AP': 'SVRS', 'CE': 'SVRS', 'DF': 'SVRS',
            'ES': 'SVRS', 'PA': 'SVRS', 'PB': 'SVRS', 'PI': 'SVRS', 'RJ': 'SVRS',
            'RN': 'SVRS', 'RO': 'SVRS', 'RR': 'SVRS', 'SC': 'SVRS', 'SE': 'SVRS', 'TO': 'SVRS',
            'AM': 'AM', 'BA': 'BA', 'GO': 'GO', 'MA': 'MA', 'MG': 'MG', 'MS': 'MS',
            'MT': 'MT', 'PE': 'PE', 'PR': 'PR', 'RS': 'RS', 'SP': 'SP'
        };

        // Mapeamento UF -> SVC (contingência)
        this.ufToSvc = {
            'AC': 'SVC-AN', 'AL': 'SVC-AN', 'AP': 'SVC-AN', 'CE': 'SVC-AN', 'DF': 'SVC-AN',
            'ES': 'SVC-AN', 'MG': 'SVC-AN', 'PA': 'SVC-AN', 'PB': 'SVC-AN', 'RJ': 'SVC-AN',
            'RN': 'SVC-AN', 'RO': 'SVC-AN', 'RR': 'SVC-AN', 'RS': 'SVC-AN', 'SC': 'SVC-AN',
            'SE': 'SVC-AN', 'SP': 'SVC-AN', 'TO': 'SVC-AN',
            'AM': 'SVC-RS', 'BA': 'SVC-RS', 'GO': 'SVC-RS', 'MA': 'SVC-RS', 'MS': 'SVC-RS',
            'MT': 'SVC-RS', 'PE': 'SVC-RS', 'PI': 'SVC-RS', 'PR': 'SVC-RS'
        };

        this.ufCodes = {
            'RO': 11, 'AC': 12, 'AM': 13, 'RR': 14, 'PA': 15, 'AP': 16, 'TO': 17,
            'MA': 21, 'PI': 22, 'CE': 23, 'RN': 24, 'PB': 25, 'PE': 26, 'AL': 27, 'SE': 28, 'BA': 29,
            'MG': 31, 'ES': 32, 'RJ': 33, 'SP': 35,
            'PR': 41, 'SC': 42, 'RS': 43,
            'MS': 50, 'MT': 51, 'GO': 52, 'DF': 53
        };
    }

    // === RESOLUÇÃO DE ENDPOINTS ===

    _getSefazForState(state) {
        return this.ufToSefaz[state] || 'SVRS';
    }

    _getSvcForState(state) {
        return this.ufToSvc[state] || 'SVC-AN';
    }

    _getEndpoint(state, service, environment, contingency = false) {
        let sefazKey;
        if (contingency) {
            sefazKey = this._getSvcForState(state);
        } else {
            sefazKey = this._getSefazForState(state);
        }

        const sefaz = this.endpoints[sefazKey];
        if (!sefaz || !sefaz[service]) {
            throw new Error(`Endpoint ${service} não configurado para estado ${state} (SEFAZ: ${sefazKey})`);
        }
        return sefaz[service][environment] || sefaz[service]['homologation'];
    }

    _getQrCodeUrl(state, environment) {
        const sefazKey = this._getSefazForState(state);
        const sefaz = this.endpoints[sefazKey];
        if (!sefaz?.qrCode) return '';
        return sefaz.qrCode[environment] || sefaz.qrCode['homologation'];
    }

    // === RATE LIMITING ===

    _checkRateLimit(cnpj) {
        const now = Date.now();
        const counter = this.rejectionCounters.get(cnpj);

        if (!counter) return { allowed: true };

        if (now - counter.firstRejectionAt > this.REJECTION_WINDOW_MS) {
            this.rejectionCounters.delete(cnpj);
            return { allowed: true };
        }

        if (counter.count >= this.REJECTION_THRESHOLD) {
            const remainingMs = this.REJECTION_WINDOW_MS - (now - counter.firstRejectionAt);
            const remainingMin = Math.ceil(remainingMs / 60000);
            return { allowed: false, waitMinutes: remainingMin, count: counter.count };
        }

        return { allowed: true, count: counter.count };
    }

    _recordRejection(cnpj) {
        const now = Date.now();
        const counter = this.rejectionCounters.get(cnpj);

        if (!counter || now - counter.firstRejectionAt > this.REJECTION_WINDOW_MS) {
            this.rejectionCounters.set(cnpj, { count: 1, firstRejectionAt: now });
        } else {
            counter.count++;
        }
    }

    _resetRejections(cnpj) {
        this.rejectionCounters.delete(cnpj);
    }

    // === VALIDAÇÃO PRÉ-EMISSÃO ===

    _validateBeforeEmission(order, config, items) {
        const errors = [];

        if (!config.certificate || !config.certPassword) {
            errors.push('Certificado A1 não configurado ou sem senha.');
        }
        if (!config.cnpj || config.cnpj.replace(/\D/g, '').length !== 14) {
            errors.push('CNPJ inválido ou não informado.');
        }
        if (!config.ie) {
            errors.push('Inscrição Estadual não informada.');
        }
        if (!config.state) {
            errors.push('UF (estado) não informado na configuração fiscal.');
        }
        if (!config.ibgeCode) {
            errors.push('Código IBGE da cidade não informado.');
        }
        if (!items || items.length === 0) {
            errors.push('Pedido não possui itens.');
        }

        // Validar NCM e CFOP dos itens
        if (items) {
            items.forEach((item, index) => {
                const product = item.product || {};
                if (!product.ncm || product.ncm.length !== 8) {
                    errors.push(`Item ${index + 1} (${product.name || 'desconhecido'}): NCM deve ter 8 dígitos.`);
                }
                if (!product.cfop || product.cfop.length !== 4) {
                    errors.push(`Item ${index + 1} (${product.name || 'desconhecido'}): CFOP deve ter 4 dígitos.`);
                }
            });
        }

        // Verificar rate limit
        const rateCheck = this._checkRateLimit(config.cnpj.replace(/\D/g, ''));
        if (!rateCheck.allowed) {
            errors.push(`Rate limit atingido: ${rateCheck.count} rejeições na última hora. Aguarde ${rateCheck.waitMinutes} min.`);
        }

        return errors;
    }

    // === LOG DE AUDITORIA ===

    async _logAudit(restaurantId, action, requestXml, responseXml, statusCode, startTime) {
        try {
            const prisma = require('../lib/prisma');
            const durationMs = Date.now() - startTime;
            const truncatedRequest = requestXml?.substring(0, 2000) || null;
            const truncatedResponse = responseXml?.substring(0, 2000) || null;

            await prisma.fiscalAuditLog.create({
                data: {
                    restaurantId,
                    action,
                    requestXml: truncatedRequest,
                    responseXml: truncatedResponse,
                    statusCode: statusCode?.toString(),
                    durationMs
                }
            });
        } catch (e) {
            logger.warn('[FISCAL AUDIT] Falha ao registrar log:', e.message);
        }
    }

    // === MOTOR PRINCIPAL: EMISSÃO NFC-e ===

    async autorizarNfce(order, config, items, nNF, serie, contingency = false) {
        const startTime = Date.now();
        try {
            // Validação pré-emissão
            const validationErrors = this._validateBeforeEmission(order, config, items);
            if (validationErrors.length > 0) {
                return { success: false, error: validationErrors.join(' | ') };
            }

            const certData = this._extractCertData(config.certificate, config.certPassword);

            // 1. Gera XML base SEM infNFeSupl
            const { xml: rawXmlWithoutQrCode, accessKey, dhEmi } = this.generateNfceXml(order, config, items, nNF, serie, false, contingency);

            // 2. Assina o XML
            const signedXml = this.signXml(rawXmlWithoutQrCode, 'infNFe', certData);

            // 3. Extrai digVal real
            const digVal = this._extractDigestValue(signedXml);

            // 4. Gera QR Code com digVal real
            const qrCodeUrl = this.generateQrCode(accessKey, config, dhEmi, order.total.toFixed(2), "0.00", digVal);

            // 5. Insere QR Code no XML final
            const finalXml = this._insertQrCodeIntoXml(signedXml, qrCodeUrl, accessKey, config);

            // 6. Envia para SEFAZ
            const result = await this.sendToSefaz(finalXml, config, certData, contingency);

            // 7. Audit log
            await this._logAudit(config.restaurantId || order.restaurantId, 'AUTORIZACAO', finalXml, result.raw, result.httpStatus, startTime);

            // 8. Rate limiting: reset em caso de sucesso
            this._resetRejections(config.cnpj.replace(/\D/g, ''));

            return {
                ...result,
                accessKey,
                nNF,
                serie,
                xml: finalXml
            };
        } catch (error) {
            logger.error('Falha na autorização NFC-e:', error);
            return { success: false, error: error.message };
        }
    }

    // === CANCELAMENTO (Evento 110110 via NFeRecepcaoEvento4) ===

    async cancelNfce(invoice, config, reason) {
        const startTime = Date.now();
        try {
            const certData = this._extractCertData(config.certificate, config.certPassword);
            const url = this._getEndpoint(config.state, 'cancelamento', config.environment);

            const httpsAgent = new https.Agent({
                cert: certData.certificatePem,
                key: certData.privateKeyPem,
                rejectUnauthorized: false
            });

            const nProt = invoice.protocol || '';
            const chAcesso = invoice.accessKey || '';

            const cancelXML = `<?xml version="1.0" encoding="UTF-8"?>
                <eventoNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">
                    <infEvento Id="ID110110${chAcesso}01">
                        <tpAmb>${config.environment === 'production' ? '1' : '2'}</tpAmb>
                        <xServ>CANCELAR</xServ>
                        <chNFe>${chAcesso}</chNFe>
                        <dhEvento>${new Date().toISOString().split('.')[0]}-03:00</dhEvento>
                        <tpEvento>110110</tpEvento>
                        <nSeqEvento>1</nSeqEvento>
                        <detEvento versao="1.00">
                            <descEvento>Cancelamento</descEvento>
                            <nProt>${nProt}</nProt>
                            <xJust>${reason.substring(0, 255)}</xJust>
                        </detEvento>
                    </infEvento>
                </eventoNFe>`;

            const signedXml = this.signXml(cancelXML, 'infEvento', certData);

            const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
                <soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
                    <soap12:Body>
                        <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4">
                            ${signedXml}
                        </nfeDadosMsg>
                    </soap12:Body>
                </soap12:Envelope>`;

            const response = await axios.post(url, soapEnvelope, {
                headers: { 'Content-Type': 'application/soap+xml; charset=utf-8' },
                httpsAgent,
                timeout: 30000
            });

            const resObj = this.parser.parse(response.data);
            const body = resObj['soap:Envelope']?.['soap:Body'] || resObj['Envelope']?.['Body'];
            const retEvento = body?.['nfeResultMsg']?.['retEventoNFe'] || body?.['retEventoNFe'];
            const retInfEvento = retEvento?.infEvento;

            await this._logAudit(config.restaurantId || invoice.restaurantId, 'CANCELAMENTO', cancelXML, response.data, response.status, startTime);

            if (retInfEvento?.cStat === '135' || retInfEvento?.cStat === '155') {
                return { success: true, protocol: retInfEvento?.nProt, message: retInfEvento?.xMotivo };
            } else {
                return { success: false, error: retInfEvento?.xMotivo || 'Erro no cancelamento' };
            }
        } catch (error) {
            logger.error('Erro ao cancelar NFC-e:', error);
            return { success: false, error: error.message };
        }
    }

    // === INUTILIZAÇÃO DE NUMERAÇÃO (NFeInutilizacao4) ===

    async inutilizarNfce(config, nNFInicio, nNFFim, reason) {
        const startTime = Date.now();
        try {
            const certData = this._extractCertData(config.certificate, config.certPassword);
            const url = this._getEndpoint(config.state, 'inutilizacao', config.environment);

            const httpsAgent = new https.Agent({
                cert: certData.certificatePem,
                key: certData.privateKeyPem,
                rejectUnauthorized: false
            });

            const cUF = this.ufCodes[config.state] || 31;
            const ano = new Date().getFullYear().toString().slice(-2);
            const cnpj = config.cnpj.replace(/\D/g, '');
            const id = `ID${cUF}${ano}${cnpj}65${(config.series || 1).toString().padStart(3, '0')}${nNFInicio.toString().padStart(9, '0')}${nNFFim.toString().padStart(9, '0')}`;

            const inutXML = `<?xml version="1.0" encoding="UTF-8"?>
                <inutNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
                    <infInut Id="${id}">
                        <tpAmb>${config.environment === 'production' ? '1' : '2'}</tpAmb>
                        <xServ>INUTILIZAR</xServ>
                        <cUF>${cUF}</cUF>
                        <ano>${ano}</ano>
                        <CNPJ>${cnpj}</CNPJ>
                        <mod>65</mod>
                        <serie>${(config.series || 1)}</serie>
                        <nNFIni>${nNFInicio}</nNFIni>
                        <nNFFin>${nNFFim}</nNFFin>
                        <xJust>${reason.substring(0, 255)}</xJust>
                    </infInut>
                </inutNFe>`;

            const signedXml = this.signXml(inutXML, 'infInut', certData);

            const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
                <soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
                    <soap12:Body>
                        <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeInutilizacao4">
                            ${signedXml}
                        </nfeDadosMsg>
                    </soap12:Body>
                </soap12:Envelope>`;

            const response = await axios.post(url, soapEnvelope, {
                headers: { 'Content-Type': 'application/soap+xml; charset=utf-8' },
                httpsAgent,
                timeout: 30000
            });

            const resObj = this.parser.parse(response.data);
            const body = resObj['soap:Envelope']?.['soap:Body'] || resObj['Envelope']?.['Body'];
            const retInut = body?.['nfeInutilizacaoNFSeResultMsg']?.['retInutNFe'] || body?.['retInutNFe'];

            await this._logAudit(config.restaurantId, 'INUTILIZACAO', inutXML, response.data, response.status, startTime);

            if (retInut?.cStat === '102' || retInut?.cStat === '561') {
                return { success: true, protocol: retInut?.nProt, message: retInut?.xMotivo };
            } else {
                return { success: false, error: retInut?.xMotivo || 'Erro na inutilização' };
            }
        } catch (error) {
            logger.error('Erro ao inutilizar numeração:', error);
            return { success: false, error: error.message };
        }
    }

    // === CARTA DE CORREÇÃO (Evento 110110) ===

    async cartaCorrecao(invoice, config, corrections) {
        const startTime = Date.now();
        try {
            const certData = this._extractCertData(config.certificate, config.certPassword);
            const url = this._getEndpoint(config.state, 'cartaCorrecao', config.environment);

            const httpsAgent = new https.Agent({
                cert: certData.certificatePem,
                key: certData.privateKeyPem,
                rejectUnauthorized: false
            });

            const chAcesso = invoice.accessKey || '';

            const ccXML = `<?xml version="1.0" encoding="UTF-8"?>
                <eventoNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">
                    <infEvento Id="ID110110${chAcesso}01">
                        <tpAmb>${config.environment === 'production' ? '1' : '2'}</tpAmb>
                        <xServ>CORRIGIR</xServ>
                        <chNFe>${chAcesso}</chNFe>
                        <dhEvento>${new Date().toISOString().split('.')[0]}-03:00</dhEvento>
                        <tpEvento>110110</tpEvento>
                        <nSeqEvento>${(invoice.ccorrectionCount || 0) + 1}</nSeqEvento>
                        <detEvento versao="1.00">
                            <descEvento>Carta de Correcao</descEvento>
                            <xCorrecao>${corrections.substring(0, 1000)}</xCorrecao>
                            <xCondUso>A Carta de Correcao e disciplinada pelo Paragrafo unico do art. 7o do Convenio S/N, de 1970 e pode ser utilizada para regularizacao de erro ocorrido na emissao de documento fiscal, desde que o erro nao esteja relacionado com: I - variaveis que determinam o valor do imposto tais como: base de calculo, aliquota, quantidade, valor da operacao ou da prestacao; II - correcao de dados cadastrais que implique mudanca do remetente ou do destinatario; III - data de emissao ou de saida.</xCondUso>
                        </detEvento>
                    </infEvento>
                </eventoNFe>`;

            const signedXml = this.signXml(ccXML, 'infEvento', certData);

            const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
                <soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
                    <soap12:Body>
                        <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4">
                            ${signedXml}
                        </nfeDadosMsg>
                    </soap12:Body>
                </soap12:Envelope>`;

            const response = await axios.post(url, soapEnvelope, {
                headers: { 'Content-Type': 'application/soap+xml; charset=utf-8' },
                httpsAgent,
                timeout: 30000
            });

            const resObj = this.parser.parse(response.data);
            const body = resObj['soap:Envelope']?.['soap:Body'] || resObj['Envelope']?.['Body'];
            const retEvento = body?.['nfeResultMsg']?.['retEventoNFe'] || body?.['retEventoNFe'];
            const retInfEvento = retEvento?.infEvento;

            await this._logAudit(config.restaurantId || invoice.restaurantId, 'CARTA_CORRECAO', ccXML, response.data, response.status, startTime);

            if (retInfEvento?.cStat === '135') {
                return { success: true, protocol: retInfEvento?.nProt, message: retInfEvento?.xMotivo };
            } else {
                return { success: false, error: retInfEvento?.xMotivo || 'Erro na carta de correção' };
            }
        } catch (error) {
            logger.error('Erro ao enviar carta de correção:', error);
            return { success: false, error: error.message };
        }
    }

    // === MÉTODOS AUXILIARES ===

    _extractDigestValue(signedXml) {
        try {
            const digMatch = signedXml.match(/<DigestValue>([^<]+)<\/DigestValue>/);
            return digMatch ? digMatch[1] : '';
        } catch (e) {
            logger.warn('Não foi possível extrair digVal, usando vazio');
            return '';
        }
    }

    _insertQrCodeIntoXml(signedXml, qrCodeUrl, accessKey, config) {
        const urlChave = this._getQrCodeUrl(config.state, config.environment);
        const infNFeSupl = `<infNFeSupl><qrCode>${qrCodeUrl}</qrCode><urlChave>${urlChave}</urlChave></infNFeSupl>`;
        return signedXml.replace(/<\/NFe>/, `${infNFeSupl}</NFe>`);
    }

    _extractCertData(pfxBase64, password) {
        try {
            const pfxDer = forge.util.decode64(pfxBase64);
            const pfxAsn1 = forge.asn1.fromDer(pfxDer);
            const pfx = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, password);

            const keyBags = pfx.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
            const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0];
            const privateKey = keyBag.key;

            const certBags = pfx.getBags({ bagType: forge.pki.oids.certBag });
            const certBag = certBags[forge.pki.oids.certBag][0];
            const certificate = certBag.cert;

            return {
                privateKeyPem: forge.pki.privateKeyToPem(privateKey),
                certificatePem: forge.pki.certificateToPem(certificate)
            };
        } catch (e) {
            throw new Error('Erro ao processar certificado A1: ' + e.message);
        }
    }

    signXml(xml, tagToSign, certData) {
        const sig = new SignedXml();

        sig.addReference(`//*[local-name(.)='${tagToSign}']`,
            ["http://www.w3.org/2000/09/xmldsig#enveloped-signature", "http://www.w3.org/2001/10/xml-exc-c14n#"],
            "http://www.w3.org/2001/04/xmlenc#sha256"
        );

        sig.signingKey = certData.privateKeyPem;
        sig.keyInfoProvider = {
            getKeyInfo: () => `<X509Data><X509Certificate>${certData.certificatePem.replace(/---.*---|[\r\n]/g, '')}</X509Certificate></X509Data>`
        };
        sig.signatureAlgorithm = "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256";

        sig.computeSignature(xml, {
            location: { reference: `//*[local-name(.)='${tagToSign}']`, action: "after" }
        });

        return sig.getSignedXml();
    }

    generateAccessKey(cUF, date, cnpj, mod, serie, nNF, tpEmis, cNF) {
        const part = [
            cUF.toString().padStart(2, '0'),
            date.slice(2, 4) + date.slice(5, 7),
            cnpj.replace(/\D/g, '').padStart(14, '0'),
            mod.toString().padStart(2, '0'),
            serie.toString().padStart(3, '0'),
            nNF.toString().padStart(9, '0'),
            tpEmis.toString(),
            cNF.toString().padStart(8, '0')
        ].join('');

        let sum = 0;
        let weight = 2;
        for (let i = part.length - 1; i >= 0; i--) {
            sum += parseInt(part[i]) * weight;
            weight = weight === 9 ? 2 : weight + 1;
        }
        const rem = sum % 11;
        const dv = (rem === 0 || rem === 1) ? 0 : 11 - rem;

        return part + dv;
    }

    generateQrCode(accessKey, config, dhEmi, vNF, vICMS, digVal) {
        const baseUrl = this._getQrCodeUrl(config.state, config.environment);
        const tpAmb = config.environment === 'production' ? 1 : 2;
        const cIdToken = config.cscId || "000001";
        const csc = config.cscToken || "";

        const qrParam = [
            accessKey,
            2,
            tpAmb,
            parseInt(cIdToken).toString().padStart(6, '0')
        ].join('|');

        const hashString = qrParam + csc;
        const cHashQRCode = createHash('sha256').update(hashString, 'utf8').digest('hex').toUpperCase();

        return `${baseUrl}?p=${qrParam}|${cHashQRCode}`;
    }

    generateNfceXml(order, config, items, nNF, serie, includeQrCode = true, contingency = false) {
        const now = new Date();
        const dhEmi = now.toISOString().split('.')[0] + "-03:00";
        const dateStr = now.toISOString().split('T')[0];

        const cUF = this.ufCodes[config.state] || 31;
        const cNF = this._generateCNF(order, nNF, serie);
        const tpEmis = contingency ? 4 : 1; // 4=EPEC contingency

        const accessKey = this.generateAccessKey(cUF, dateStr, config.cnpj, 65, serie, nNF, tpEmis, cNF);

        const nfce = {
            NFe: {
                "@_xmlns": "http://www.portalfiscal.inf.br/nfe",
                infNFe: {
                    "@_Id": `NFe${accessKey}`,
                    "@_versao": "4.00",
                    ide: {
                        cUF: cUF,
                        cNF: cNF,
                        natOp: "VENDA",
                        mod: 65,
                        serie: serie,
                        nNF: nNF,
                        dhEmi: dhEmi,
                        tpNF: 1,
                        idDest: 1,
                        cMunFG: config.ibgeCode,
                        tpImp: 4,
                        tpEmis: tpEmis,
                        cDV: accessKey.slice(-1),
                        tpAmb: config.environment === 'production' ? 1 : 2,
                        finNFe: 1,
                        indFinal: 1,
                        indPres: 1,
                        procEmi: 0,
                        verProc: "1.0"
                    },
                    emit: {
                        CNPJ: config.cnpj.replace(/\D/g, ''),
                        xNome: config.companyName,
                        enderEmit: {
                            xLgr: config.street,
                            nro: config.number,
                            xBairro: config.neighborhood,
                            cMun: config.ibgeCode,
                            xMun: config.city,
                            UF: config.state,
                            CEP: config.zipCode.replace(/\D/g, ''),
                            cPais: 1058,
                            xPais: "BRASIL"
                        },
                        IE: config.ie.replace(/\D/g, ''),
                        CRT: config.taxRegime || "1"
                    },
                    dest: config.environment === 'production' ? undefined : {
                        xNome: "NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL"
                    },
                    det: this._buildDetItems(items),
                    total: this._buildTotal(order),
                    transp: { modFrete: 9 },
                    pag: {
                        detPag: {
                            indPag: 0,
                            tPag: "01",
                            vPag: order.total.toFixed(2)
                        }
                    }
                }
            }
        };

        if (includeQrCode) {
            nfce.NFe.infNFeSupl = {
                qrCode: this.generateQrCode(accessKey, config, dhEmi, order.total.toFixed(2), "0.00", "DIGVAL_PLACEHOLDER"),
                urlChave: this._getQrCodeUrl(config.state, config.environment)
            };
        }

        return { xml: this.builder.build(nfce), accessKey, dhEmi };
    }

    _generateCNF(order, nNF, serie) {
        const content = `${order.id || ''}${nNF}${serie}${Date.now()}`;
        const hash = createHash('md5').update(content).digest('hex');
        return parseInt(hash.slice(0, 8), 16).toString().padStart(8, '0').slice(0, 8);
    }

    _buildDetItems(items) {
        return items.map((item, index) => {
            const product = item.product || {};
            const totalItem = item.priceAtTime * item.quantity;
            const taxes = this._calculateTaxes(product, totalItem, item.priceAtTime);

            return {
                "@_nItem": index + 1,
                prod: {
                    cProd: (product.id || 'INT').slice(0, 10),
                    cEAN: "SEM GTIN",
                    xProd: product.name || "Item Integrado",
                    NCM: product.ncm || "00000000",
                    CFOP: product.cfop || "5102",
                    uCom: product.measureUnit || "UN",
                    qCom: item.quantity.toFixed(4),
                    vUnCom: item.priceAtTime.toFixed(10),
                    vProd: totalItem.toFixed(2),
                    cEANTrib: "SEM GTIN",
                    uTrib: product.measureUnit || "UN",
                    qTrib: item.quantity.toFixed(4),
                    vUnTrib: item.priceAtTime.toFixed(10),
                    indTot: 1
                },
                imposto: taxes
            };
        });
    }

    _calculateTaxes(product, totalItem, unitPrice) {
        const taxRegime = parseInt(product.taxRegime || 1);
        const origin = product.origin || 0;

        if (taxRegime === 1) {
            return {
                ICMS: { ICMSSN102: { orig: origin, CSOSN: "102" } },
                PIS: { PISOutr: { CST: "99", vBC: "0.00", pPIS: "0.00", vPIS: "0.00" } },
                COFINS: { COFINSOutr: { CST: "99", vBC: "0.00", pCOFINS: "0.00", vCOFINS: "0.00" } }
            };
        } else {
            const ncm = product.ncm || "00000000";
            const isFood = /^0[234]|17|19|20|21|22/.test(ncm);
            const icmsRate = isFood ? 12 : 18;
            const vICMS = (totalItem * icmsRate / 100).toFixed(2);
            return {
                ICMS: { ICMS00: { orig: origin, CST: "00", modBC: 3, vBC: totalItem.toFixed(2), pICMS: icmsRate.toFixed(2), vICMS } },
                PIS: { PISOutr: { CST: "99", vBC: totalItem.toFixed(2), pPIS: 1.65, vPIS: (totalItem * 0.0165).toFixed(2) } },
                COFINS: { COFINSOutr: { CST: "99", vBC: totalItem.toFixed(2), pCOFINS: 7.6, vCOFINS: (totalItem * 0.076).toFixed(2) } }
            };
        }
    }

    _buildTotal(order) {
        const vProd = parseFloat(order.total);
        const vPIS = (vProd * 0.0165).toFixed(2);
        const vCOFINS = (vProd * 0.076).toFixed(2);

        return {
            ICMSTot: {
                vBC: "0.00", vICMS: "0.00", vICMSDeson: "0.00", vFCP: "0.00",
                vBCST: "0.00", vST: "0.00", vFCPST: "0.00", vFCPSTRet: "0.00",
                vProd: vProd.toFixed(2), vFrete: "0.00", vSeg: "0.00",
                vDesc: "0.00", vII: "0.00", vIPI: "0.00", vIPIDevol: "0.00",
                vPIS, vCOFINS, vOutro: "0.00", vNF: vProd.toFixed(2)
            }
        };
    }

    async sendToSefaz(signedXml, config, certData, contingency = false) {
        const url = this._getEndpoint(config.state, 'autorizacao', config.environment, contingency);

        const httpsAgent = new https.Agent({
            cert: certData.certificatePem,
            key: certData.privateKeyPem,
            rejectUnauthorized: false
        });

        const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
            <soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
                <soap12:Body>
                    <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">
                        ${signedXml}
                    </nfeDadosMsg>
                </soap12:Body>
            </soap12:Envelope>`;

        try {
            const response = await axios.post(url, soapEnvelope, {
                headers: { 'Content-Type': 'application/soap+xml; charset=utf-8' },
                httpsAgent,
                timeout: 30000
            });

            const resObj = this.parser.parse(response.data);
            const body = resObj['soap:Envelope']?.['soap:Body'] || resObj['Envelope']?.['Body'];
            const ret = body?.['nfeResultMsg']?.['retEnviNFe'] || body?.['retEnviNFe'];

            // Rate limiting: registrar rejeição se houver
            const cStat = ret?.cStat || ret?.protNFe?.infProt?.cStat;
            if (cStat && cStat !== '100' && cStat !== '150' && cStat !== '103') {
                this._recordRejection(config.cnpj.replace(/\D/g, ''));
            }

            return { success: true, data: ret || resObj, raw: response.data, httpStatus: response.status };
        } catch (err) {
            logger.error('Erro na comunicação SEFAZ:', err.response?.data || err.message);
            throw new Error('Falha na comunicação com SEFAZ: ' + (err.response?.data || err.message));
        }
    }

    async consultReceipt(recibo, config) {
        try {
            const certData = this._extractCertData(config.certificate, config.certPassword);
            const url = this._getEndpoint(config.state, 'autorizacao', config.environment)
                .replace('NFeAutorizacao4', 'NFeRetAutorizacao4');

            const httpsAgent = new https.Agent({
                cert: certData.certificatePem,
                key: certData.privateKeyPem,
                rejectUnauthorized: false
            });

            const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
                <soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
                    <soap12:Body>
                        <nfeConsReciP xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeRetAutorizacao4">
                            <tpAmb>${config.environment === 'production' ? '1' : '2'}</tpAmb>
                            <nRec>${recibo}</nRec>
                        </nfeConsReciP>
                    </soap12:Body>
                </soap12:Envelope>`;

            const response = await axios.post(url, soapEnvelope, {
                headers: { 'Content-Type': 'application/soap+xml; charset=utf-8' },
                httpsAgent,
                timeout: 30000
            });

            const resObj = this.parser.parse(response.data);
            const body = resObj['soap:Envelope']?.['soap:Body'] || resObj['Envelope']?.['Body'];
            const prot = body?.['nfeRetAutorizacaoLoteResultMsg']?.['protNFe'] || body?.['protNFe'];

            return { success: true, data: prot, accessKey: prot?.chNFe };
        } catch (error) {
            logger.error('Erro ao consultar recibo:', error);
            return { success: false, error: error.message };
        }
    }

    // === DANFE PDF ===

    async generateDanfePdf(invoice, config, order) {
        try {
            const pdfmake = require('pdfmake');

            const docDefinition = {
                pageSize: 'A4',
                pageMargins: [10, 10, 10, 10],
                content: [
                    { text: 'DANFE', style: 'header', alignment: 'center' },
                    { text: 'Documento Auxiliar da Nota Fiscal Eletrônica', alignment: 'center', fontSize: 10 },
                    { text: '\n' },
                    this._buildDanfeEmitter(config),
                    { text: '\n' },
                    this._buildDanfeRecipient(config),
                    { text: '\n' },
                    this._buildDanfeItems(order),
                    { text: '\n' },
                    this._buildDanfeTotals(order, invoice),
                    { text: '\n' },
                    this._buildDanfeQrCode(invoice),
                ],
                styles: {
                    header: { fontSize: 18, bold: true },
                    tableHeader: { bold: true, fillColor: '#eeeeee' }
                },
                defaultStyle: { fontSize: 10 }
            };

            const pdfDocGenerator = pdfmake.createPdf(docDefinition);

            return new Promise((resolve, reject) => {
                pdfDocGenerator.getBuffer((buffer) => resolve(buffer));
            });
        } catch (error) {
            logger.error('Erro ao gerar DANFE PDF:', error);
            throw new Error('Para gerar DANFE PDF, instale: npm install pdfmake');
        }
    }

    _buildDanfeEmitter(config) {
        return {
            table: {
                widths: ['*'],
                body: [[{ text: 'EMITENTE', style: 'tableHeader', alignment: 'center' }], [
                    `Razão Social: ${config.companyName || 'N/A'}\n` +
                    `CNPJ: ${config.cnpj || 'N/A'} | IE: ${config.ie || 'N/A'}\n` +
                    `Endereço: ${config.street || ''}, ${config.number || ''}\n` +
                    `${config.neighborhood || ''} - ${config.city || ''}/${config.state || ''}\n` +
                    `CEP: ${config.zipCode || ''}`
                ]]
            },
            layout: 'lightHorizontalLines'
        };
    }

    _buildDanfeRecipient(config) {
        return {
            table: {
                widths: ['*'],
                body: [[{ text: 'DESTINATÁRIO', style: 'tableHeader', alignment: 'center' }], [
                    `Nome: ${config.environment === 'production' ? 'CONSUMIDOR' : 'NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO'}\n` +
                    `CPF/CNPJ: ${config.cnpj || 'N/A'}`
                ]]
            },
            layout: 'lightHorizontalLines'
        };
    }

    _buildDanfeItems(order) {
        const items = (order.items || []).map((item, i) => [
            (i + 1).toString(),
            item.product?.name || 'Produto',
            item.quantity.toString(),
            item.priceAtTime.toFixed(2),
            (item.priceAtTime * item.quantity).toFixed(2)
        ]);

        return {
            table: {
                headerRows: 1,
                widths: [20, '*', 40, 60, 60],
                body: [
                    [{ text: '#', style: 'tableHeader' }, { text: 'Descrição', style: 'tableHeader' }, { text: 'Qtd', style: 'tableHeader' }, { text: 'Valor Unit.', style: 'tableHeader' }, { text: 'Total', style: 'tableHeader' }],
                    ...items
                ]
            },
            layout: 'lightHorizontalLines'
        };
    }

    _buildDanfeTotals(order, invoice) {
        return {
            table: {
                widths: ['*', 100],
                body: [
                    [{ text: 'TOTAL NOTA FISCAL', style: 'tableHeader' }, { text: `R$ ${order.total?.toFixed(2) || '0.00'}`, alignment: 'right', bold: true }]
                ]
            },
            layout: 'lightHorizontalLines'
        };
    }

    _buildDanfeQrCode(invoice) {
        return {
            table: {
                widths: ['*'],
                body: [
                    [{ text: 'CONSULTA PELA CHAVE DE ACESSO', style: 'tableHeader', alignment: 'center' }],
                    [{ text: invoice.accessKey || 'Chave não disponível', alignment: 'center', fontSize: 8 }],
                    [{ text: 'Verifique a autenticidade no site da SEFAZ', alignment: 'center', fontSize: 8 }]
                ]
            },
            layout: 'lightHorizontalLines'
        };
    }

    validateCertificate(pfxBase64, password) {
        try {
            const certData = this._extractCertData(pfxBase64, password);
            const forgeCert = forge.pki.certificateFromPem(certData.certificatePem);
            const notAfter = forgeCert.validity.notAfter;
            const now = new Date();
            const daysUntilExpiry = Math.floor((notAfter - now) / (1000 * 60 * 60 * 24));

            return {
                valid: daysUntilExpiry > 0,
                expiresAt: notAfter.toISOString(),
                daysUntilExpiry,
                subject: forgeCert.subject.getField('CN')?.value || 'Certificado'
            };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }
}

module.exports = new FiscalService();
