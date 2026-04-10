const prisma = require('../lib/prisma');
const logger = require('../config/logger');
const XLSX = require('xlsx');
const { normalizePhone } = require('../lib/phoneUtils');

class CustomerImportService {
    async importFromExcel(restaurantId, fileBuffer) {
        try {
            const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(sheet);

            if (!data || data.length === 0) {
                throw new Error('Planilha vazia ou sem dados.');
            }

            let imported = 0;
            let updated = 0;
            let errors = [];

            for (let i = 0; i < data.length; i++) {
                const row = data[i];
                const rowNumber = i + 2;

                try {
                    const name = String(row['nome'] || row['Nome'] || '').trim();
                    const phone = String(row['telefone'] || row['Telefone'] || row['phone'] || '').trim();

                    if (!name) {
                        errors.push({ row: rowNumber, error: 'Nome obrigatório' });
                        continue;
                    }

                    if (!phone) {
                        errors.push({ row: rowNumber, error: 'Telefone obrigatório' });
                        continue;
                    }

                    const cleanPhone = normalizePhone(phone);
                    const street = String(row['logradouro'] || row['endereco'] || row['street'] || row['Endereço'] || '').trim();
                    const number = String(row['numero'] || row['number'] || row['Número'] || '').trim();
                    const neighborhood = String(row['bairro'] || row['neighborhood'] || row['Bairro'] || '').trim();
                    const city = String(row['cidade'] || row['city'] || row['Cidade'] || '').trim();
                    const state = String(row['estado'] || row['state'] || row['Estado'] || '').trim();
                    const complement = String(row['complemento'] || row['complement'] || row['Complemento'] || '').trim();
                    const reference = String(row['referencia'] || row['reference'] || row['Referência'] || '').trim();
                    const zipCode = String(row['cep'] || row['CEP'] || '').trim();

                    const fullAddress = street ? `${street}, ${number}`.trim() : null;

                    const existingCustomer = await prisma.customer.findFirst({
                        where: {
                            phone: cleanPhone,
                            restaurantId
                        }
                    });

                    if (existingCustomer) {
                        await prisma.customer.update({
                            where: { id: existingCustomer.id },
                            data: {
                                name,
                                phone: cleanPhone,
                                street: street || null,
                                number: number || null,
                                neighborhood: neighborhood || null,
                                city: city || null,
                                state: state || null,
                                complement: complement || null,
                                reference: reference || null,
                                zipCode: zipCode || null,
                                address: fullAddress
                            }
                        });
                        updated++;
                    } else {
                        await prisma.customer.create({
                            data: {
                                name,
                                phone: cleanPhone,
                                street: street || null,
                                number: number || null,
                                neighborhood: neighborhood || null,
                                city: city || null,
                                state: state || null,
                                complement: complement || null,
                                reference: reference || null,
                                zipCode: zipCode || null,
                                address: fullAddress,
                                restaurantId
                            }
                        });
                        imported++;
                    }
                } catch (rowError) {
                    errors.push({ row: rowNumber, error: rowError.message });
                }
            }

            return {
                success: true,
                message: `Importação concluída: ${imported} novos clientes, ${updated} atualizados.`,
                details: { imported, updated, errors, total: data.length }
            };
        } catch (error) {
            logger.error('Erro na importação de clientes:', error);
            throw new Error('Falha ao processar arquivo: ' + error.message);
        }
    }

    generateTemplate() {
        const template = [
            {
                nome: 'João da Silva',
                telefone: '11999999999',
                logradouro: 'Rua das Flores',
                numero: '123',
                bairro: 'Centro',
                cidade: 'São Paulo',
                estado: 'SP',
                complemento: 'Apto 1',
                referencia: 'Próximo ao mercado',
                cep: '01000000'
            }
        ];

        const worksheet = XLSX.utils.json_to_sheet(template);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Modelo');

        return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    }
}

module.exports = new CustomerImportService();