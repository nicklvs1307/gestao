const forge = require('node-forge');
const { SignedXml } = require('xml-crypto');
const axios = require('axios');
const https = require('https');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');
const sha1 = require('sha1');

class FiscalService {
    constructor() {
        this.parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
        this.builder = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: "@_" });
        
        // Endereços SEFAZ Minas Gerais (NFC-e 4.00)
        this.endpoints = {
            'MG': {
                homologation: 'https://hnfce.fazenda.mg.gov.br/nfce/services/NFeAutorizacao4',
                production: 'https://nfce.fazenda.mg.gov.br/nfce/services/NFeAutorizacao4',
                qrCode: {
                    homologation: 'https://hnfce.fazenda.mg.gov.br/portalfiscalnfce/view/consulta/consulta.xhtml',
                    production: 'https://nfce.fazenda.mg.gov.br/portalfiscalnfce/view/consulta/consulta.xhtml'
                }
            },
            'SP': {
                homologation: 'https://homologacao.nfce.fazenda.sp.gov.br/ws/nfceautorizacao4.asmx',
                production: 'https://nfce.fazenda.sp.gov.br/ws/nfceautorizacao4.asmx',
                qrCode: {
                    homologation: 'https://www.homologacao.nfce.fazenda.sp.gov.br/consulta',
                    production: 'https://www.nfce.fazenda.sp.gov.br/consulta'
                }
            },
            // Adicionar outros conforme necessário ou usar SVRS (Sefaz Virtual Rio Grande do Sul)
        };
    }

    /**
     * Motor principal: Gera, Assina e Envia
     */
    async autorizarNfce(order, config, items, nNF, serie) {
        try {
            if (!config.certificate || !config.certPassword) {
                throw new Error('Certificado A1 não configurado ou sem senha.');
            }

            // 1. Extrai dados do certificado
            const certData = this._extractCertData(config.certificate, config.certPassword);

            // 2. Gera XML base
            const { xml: rawXml, accessKey } = this.generateNfceXml(order, config, items, nNF, serie);

            // 3. Assina o XML
            const signedXml = this.signXml(rawXml, 'infNFe', certData);

            // 4. Envia para a SEFAZ usando mTLS
            const result = await this.sendToSefaz(signedXml, config, certData);
            
            return { 
                ...result, 
                accessKey, 
                nNF, 
                serie,
                xml: signedXml 
            };
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
            getKeyInfo: () => `<X509Data><X509Certificate>${certData.certificatePem.replace(/---.*---|[\r\n]/g, '')}</X509Certificate></X509Data>`
        };

        sig.computeSignature(xml, {
            location: { reference: `//*[local-name(.)='${tagToSign}']`, action: "after" }
        });

        return sig.getSignedXml();
    }

    /**
     * Gera a Chave de Acesso da NFe/NFCe (44 dígitos)
     */
    generateAccessKey(cUF, date, cnpj, mod, serie, nNF, tpEmis, cNF) {
        const part = [
            cUF.toString().padStart(2, '0'),
            date.slice(2, 4) + date.slice(5, 7), // YYMM
            cnpj.replace(/\D/g, '').padStart(14, '0'),
            mod.toString().padStart(2, '0'),
            serie.toString().padStart(3, '0'),
            nNF.toString().padStart(9, '0'),
            tpEmis.toString(),
            cNF.toString().padStart(8, '0')
        ].join('');

        // Cálculo do dígito verificador (Módulo 11)
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

    /**
     * Gera o link do QR-Code da NFC-e
     */
    generateQrCode(accessKey, config, dhEmi, vNF, vICMS, digVal) {
        const stateConfig = this.endpoints[config.state] || this.endpoints['MG'];
        const baseUrl = config.environment === 'production' ? stateConfig.qrCode.production : stateConfig.qrCode.homologation;
        
        const tpAmb = config.environment === 'production' ? 1 : 2;
        const cIdToken = config.cscId || "000001";
        const csc = config.cscToken || "";

        // Monta string para o hash
        // p=CHAVE|VERSAO|TPAMB|[IDTOKEN]|HASH
        const qrParam = [
            accessKey,
            2, // Versão QR Code
            tpAmb,
            parseInt(cIdToken).toString().padStart(6, '0')
        ].join('|');

        const hashString = qrParam + csc;
        const cHashQRCode = sha1(hashString).toUpperCase();

        return `${baseUrl}?p=${qrParam}|${cHashQRCode}`;
    }

    /**
     * Gera o XML da NFC-e
     */
    generateNfceXml(order, config, items, nNF, serie) {
        const now = new Date();
        const dhEmi = now.toISOString().split('.')[0] + "-03:00";
        const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
        
        const ufCodes = { 'RO': 11, 'AC': 12, 'AM': 13, 'RR': 14, 'PA': 15, 'AP': 16, 'TO': 17, 'MA': 21, 'PI': 22, 'CE': 23, 'RN': 24, 'PB': 25, 'PE': 26, 'AL': 27, 'SE': 28, 'BA': 29, 'MG': 31, 'ES': 32, 'RJ': 33, 'SP': 35, 'PR': 41, 'SC': 42, 'RS': 43, 'MS': 50, 'MT': 51, 'GO': 52, 'DF': 53 };
        const cUF = ufCodes[config.state] || 31;
        const cNF = Math.floor(Math.random() * 99999999).toString().padStart(8, '0');
        
        const accessKey = this.generateAccessKey(cUF, dateStr, config.cnpj, 65, serie, nNF, 1, cNF);

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
                        tpEmis: 1,
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
                    det: items.map((item, index) => ({
                        "@_nItem": index + 1,
                        prod: {
                            cProd: item.product.id.slice(0, 10),
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
                            PIS: { PISOutr: { CST: "99", vBC: "0.00", pPIS: "0.00", vPIS: "0.00" } },
                            COFINS: { COFINSOutr: { CST: "99", vBC: "0.00", pCOFINS: "0.00", vCOFINS: "0.00" } }
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
                },
                infNFeSupl: {
                    qrCode: this.generateQrCode(accessKey, config, dhEmi, order.total.toFixed(2), "0.00", "DIGVAL_PLACEHOLDER"),
                    urlChave: config.environment === 'production' 
                        ? (this.endpoints[config.state]?.qrCode.production || "") 
                        : (this.endpoints[config.state]?.qrCode.homologation || "")
                }
            }
        };

        // Nota: O digVal real só é conhecido após a assinatura do XML. 
        // Em NFCe 2.0, o digVal no QR Code é opcional se enviado para SEFAZ, 
        // mas alguns estados exigem. Idealmente, assina-se sem infNFeSupl, pega digVal, e gera QR Code.
        
        return { 
            xml: this.builder.build(nfce),
            accessKey 
        };
    }

    /**
     * Envia para a SEFAZ
     */
    async sendToSefaz(signedXml, config, certData) {
        const stateConfig = this.endpoints[config.state] || this.endpoints['MG'];
        const url = config.environment === 'production' ? stateConfig.production : stateConfig.homologation;
        
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
            
            // Tentar extrair o protocolo e status do retorno SEFAZ
            const body = resObj['soap:Envelope']?.['soap:Body'] || resObj['Envelope']?.['Body'];
            const ret = body?.['nfeResultMsg']?.['retEnviNFe'] || body?.['retEnviNFe'];

            return { 
                success: true, 
                data: ret || resObj,
                raw: response.data 
            };
        } catch (err) {
            console.error('Erro na comunicação SEFAZ:', err.response?.data || err.message);
            throw new Error('Falha na comunicação com SEFAZ: ' + (err.response?.data || err.message));
        }
    }
}

module.exports = new FiscalService();
