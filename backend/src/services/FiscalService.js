const forge = require('node-forge');
const { SignedXml } = require('xml-crypto');
const axios = require('axios');
const https = require('https');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');

class FiscalService {
    constructor() {
        this.parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
        this.builder = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: "@_" });
        
        // Endereços SEFAZ Minas Gerais (NFC-e 4.00)
        this.endpoints = {
            homologation: {
                autorizacao: 'https://hnfce.fazenda.mg.gov.br/nfce/services/NFeAutorizacao4',
                retAutorizacao: 'https://hnfce.fazenda.mg.gov.br/nfce/services/NFeRetAutorizacao4',
                statusServico: 'https://hnfce.fazenda.mg.gov.br/nfce/services/NFeStatusServico4'
            },
            production: {
                autorizacao: 'https://nfce.fazenda.mg.gov.br/nfce/services/NFeAutorizacao4',
                retAutorizacao: 'https://nfce.fazenda.mg.gov.br/nfce/services/NFeRetAutorizacao4',
                statusServico: 'https://nfce.fazenda.mg.gov.br/nfce/services/NFeStatusServico4'
            }
        };
    }

    /**
     * Motor principal: Gera, Assina e Envia
     */
    async autorizarNfce(order, config, items) {
        try {
            if (!config.certificate || !config.certPassword) {
                throw new Error('Certificado A1 não configurado ou sem senha.');
            }

            // 1. Extrai dados do certificado
            const certData = this._extractCertData(config.certificate, config.certPassword);

            // 2. Gera XML base
            const rawXml = this.generateNfceXml(order, config, items);

            // 3. Assina o XML
            const signedXml = this.signXml(rawXml, 'infNFe', certData);

            // 4. Envia para a SEFAZ usando mTLS
            return await this.sendToSefaz(signedXml, config, certData);
        } catch (error) {
            console.error('Falha na autorização NFC-e:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Extrai a chave privada e o certificado do PFX (Base64)
     */
    _extractCertData(pfxBase64, password) {
        try {
            const pfxDer = forge.util.decode64(pfxBase64);
            const pfxAsn1 = forge.asn1.fromDer(pfxDer);
            const pfx = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, password);
            
            // Busca a chave privada
            const keyBags = pfx.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
            const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0];
            const privateKey = keyBag.key;

            // Busca o certificado
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

    /**
     * Assina o XML digitalmente no padrão SEFAZ
     */
    signXml(xml, tagToSign, certData) {
        const sig = new SignedXml();
        
        sig.addReference(`//*[local-name(.)='${tagToSign}']`, 
            ["http://www.w3.org/2000/09/xmldsig#enveloped-signature", "http://www.w3.org/2001/10/xml-exc-c14n#"],
            "http://www.w3.org/2000/09/xmldsig#sha1"
        );
        
        sig.signingKey = certData.privateKeyPem;
        sig.keyInfoProvider = {
            getKeyInfo: () => `<X509Data><X509Certificate>${certData.certificatePem.replace(/---.*---|
|/g, '')}</X509Certificate></X509Data>`
        };

        sig.computeSignature(xml, {
            location: { reference: `//*[local-name(.)='${tagToSign}']`, action: "after" }
        });

        return sig.getSignedXml();
    }

    /**
     * Gera o XML da NFC-e (Simplificado para Minas Gerais)
     */
    generateNfceXml(order, config, items) {
        const now = new Date().toLocaleString("pt-BR", {timeZone: "America/Sao_Paulo"});
        const [date, time] = now.split(', ');
        const [d, m, y] = date.split('/');
        const dhEmi = `${y}-${m}-${d}T${time}-03:00`; // TODO: Parametrizar Timezone se sair do BR
        
        const cuId = order.id.replace(/\D/g, '').slice(0, 8);
        
        // Mapeamento UF -> Código IBGE
        const ufCodes = { 'RO': 11, 'AC': 12, 'AM': 13, 'RR': 14, 'PA': 15, 'AP': 16, 'TO': 17, 'MA': 21, 'PI': 22, 'CE': 23, 'RN': 24, 'PB': 25, 'PE': 26, 'AL': 27, 'SE': 28, 'BA': 29, 'MG': 31, 'ES': 32, 'RJ': 33, 'SP': 35, 'PR': 41, 'SC': 42, 'RS': 43, 'MS': 50, 'MT': 51, 'GO': 52, 'DF': 53 };
        const cUF = ufCodes[config.state] || 35; // Default SP se não achar
        
        const nfce = {
            NFe: {
                "@_xmlns": "http://www.portalfiscal.inf.br/nfe",
                infNFe: {
                    "@_Id": `NFe${cUF}${y.slice(2)}${config.cnpj}650010000000011${cuId}1`, 
                    "@_versao": "4.00",
                    ide: {
                        cUF: cUF,
                        cNF: cuId,
                        natOp: "VENDA",
                        mod: 65,
                        serie: 1,
                        nNF: 1,
                        dhEmi: dhEmi,
                        tpNF: 1,
                        idDest: 1,
                        cMunFG: config.ibgeCode || 3106200,
                        tpImp: 4,
                        tpEmis: 1,
                        cDV: 1,
                        tpAmb: config.environment === 'production' ? 1 : 2,
                        finNFe: 1,
                        indFinal: 1,
                        indPres: 1,
                        procEmi: 0,
                        verProc: "1.0"
                    },
                    emit: {
                        CNPJ: config.cnpj,
                        xNome: config.companyName,
                        enderEmit: {
                            xLgr: config.street,
                            nro: config.number,
                            xBairro: config.neighborhood,
                            cMun: config.ibgeCode,
                            xMun: config.city,
                            UF: config.state || "SP",
                            CEP: config.zipCode,
                            cPais: 1058,
                            xPais: "BRASIL"
                        },
                        IE: config.ie,
                        CRT: config.taxRegime || "1"
                    },
                    dest: {
                        xNome: "NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL"
                    },
                    det: items.map((item, index) => ({
                        "@_nItem": index + 1,
                        prod: {
                            cProd: item.product.id.slice(0, 8),
                            cEAN: "SEM GTIN",
                            xProd: item.product.name,
                            NCM: item.product.ncm || "00000000",
                            CFOP: item.product.cfop || "5102",
                            uCom: item.product.measureUnit || "UN",
                            qCom: item.quantity.toFixed(4),
                            vUnCom: item.priceAtTime.toFixed(10),
                            vProd: (item.priceAtTime * item.quantity).toFixed(2),
                            cEANTrib: "SEM GTIN",
                            uTrib: item.product.measureUnit || "UN",
                            qTrib: item.quantity.toFixed(4),
                            vUnTrib: item.priceAtTime.toFixed(10),
                            indTot: 1
                        },
                        imposto: {
                            ICMS: { ICMSSN102: { orig: item.product.origin || 0, CSOSN: "102" } },
                            PIS: { PISAliq: { CST: "01", vBC: "0.00", pPIS: "0.00", vPIS: "0.00" } },
                            COFINS: { COFINSAliq: { CST: "01", vBC: "0.00", pCOFINS: "0.00", vCOFINS: "0.00" } }
                        }
                    })),
                    total: {
                        ICMSTot: {
                            vBC: "0.00", vICMS: "0.00", vICMSDeson: "0.00", vFCP: "0.00",
                            vBCST: "0.00", vST: "0.00", vFCPST: "0.00", vFCPSTRet: "0.00",
                            vProd: order.total.toFixed(2), vFrete: "0.00", vSeg: "0.00",
                            vDesc: "0.00", vII: "0.00", vIPI: "0.00", vIPIDevol: "0.00",
                            vPIS: "0.00", vCOFINS: "0.00", vOutro: "0.00", vNF: order.total.toFixed(2)
                        }
                    },
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

        return this.builder.build(nfce);
    }

    /**
     * Envia para a SEFAZ usando Agente HTTPS com Certificado A1
     */
    async sendToSefaz(signedXml, config, certData) {
        const url = config.environment === 'production' ? this.endpoints.production.autorizacao : this.endpoints.homologation.autorizacao;
        
        // Cria o agente HTTPS com o certificado A1 (mTLS)
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
                httpsAgent
            });

            const resObj = this.parser.parse(response.data);
            return { 
                success: true, 
                data: resObj,
                raw: response.data 
            };
        } catch (err) {
            console.error('Erro na comunicação SEFAZ-MG:', err.response?.data || err.message);
            throw new Error('Falha na comunicação com SEFAZ-MG: ' + (err.response?.data || err.message));
        }
    }
}

module.exports = new FiscalService();