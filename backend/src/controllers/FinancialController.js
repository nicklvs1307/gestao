const prisma = require('../lib/prisma');

// === GERENCIAMENTO DE FORNECEDORES ===

// Listar Fornecedores
exports.getSuppliers = async (req, res) => {
  const { restaurantId } = req.user;
  try {
    const suppliers = await prisma.supplier.findMany({
      where: { restaurantId },
      orderBy: { name: 'asc' }
    });
    res.json(suppliers);
  } catch (error) {
    console.error('Erro ao buscar fornecedores:', error);
    res.status(500).json({ error: 'Erro ao buscar fornecedores.' });
  }
};

// Criar Fornecedor
exports.createSupplier = async (req, res) => {
  const { restaurantId } = req.user;
  const { name, cnpj, email, phone, contactName, address, city, state } = req.body;

  if (!name) return res.status(400).json({ error: 'Nome do fornecedor é obrigatório.' });

  try {
    const supplier = await prisma.supplier.create({
      data: {
        name, cnpj, email, phone, contactName, address, city, state,
        restaurant: { connect: { id: restaurantId } }
      }
    });
    res.status(201).json(supplier);
  } catch (error) {
    console.error('Erro ao criar fornecedor:', error);
    res.status(500).json({ error: 'Erro ao criar fornecedor.' });
  }
};

// Atualizar Fornecedor
exports.updateSupplier = async (req, res) => {
  const { id } = req.params;
  const { name, cnpj, email, phone, contactName, address, city, state } = req.body;

  try {
    const supplier = await prisma.supplier.update({
      where: { id },
      data: { name, cnpj, email, phone, contactName, address, city, state }
    });
    res.json(supplier);
  } catch (error) {
    console.error('Erro ao atualizar fornecedor:', error);
    res.status(500).json({ error: 'Erro ao atualizar fornecedor.' });
  }
};

// Deletar Fornecedor
exports.deleteSupplier = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.supplier.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar fornecedor:', error);
    res.status(500).json({ error: 'Erro ao deletar fornecedor (pode ter vínculos financeiros).' });
  }
};

// === GERENCIAMENTO DE CATEGORIAS FINANCEIRAS ===

exports.getCategories = async (req, res) => {
  const { restaurantId } = req.user;
  try {
    const categories = await prisma.transactionCategory.findMany({
      where: { restaurantId },
      orderBy: { name: 'asc' }
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar categorias.' });
  }
};

exports.createCategory = async (req, res) => {
  const { restaurantId } = req.user;
  const { name, type } = req.body; // type: INCOME ou EXPENSE

  try {
    const category = await prisma.transactionCategory.create({
      data: {
        name, type,
        restaurant: { connect: { id: restaurantId } }
      }
    });
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar categoria.' });
  }
};

// === TRANSAÇÕES FINANCEIRAS (CONTAS A PAGAR/RECEBER) ===

// Listar Transações (com filtros de data)
exports.getTransactions = async (req, res) => {
  const { restaurantId } = req.user;
  const { startDate, endDate, status, type } = req.query;

  const where = { restaurantId };
  
  if (startDate && endDate) {
    where.dueDate = {
      gte: new Date(startDate),
      lte: new Date(endDate)
    };
  }
  
  if (status) where.status = status;
  if (type) where.type = type;

  try {
    const transactions = await prisma.financialTransaction.findMany({
      where,
      include: {
        category: true,
        supplier: true,
        order: {
            include: { invoice: true }
        }
      },
      orderBy: { dueDate: 'asc' }
    });
    
    // Calcula totais
    const summary = transactions.reduce((acc, t) => {
        if (t.type === 'INCOME') acc.totalIncome += t.amount;
        if (t.type === 'EXPENSE') acc.totalExpense += t.amount;
        return acc;
    }, { totalIncome: 0, totalExpense: 0 });

    res.json({ transactions, summary });
  } catch (error) {
    console.error('Erro ao buscar transações:', error);
    res.status(500).json({ error: 'Erro ao buscar transações.' });
  }
};

// Criar Transação (Conta a Pagar/Receber)
exports.createTransaction = async (req, res) => {
  const { restaurantId } = req.user;
  const { 
    description, amount, type, dueDate, status, 
    categoryId, supplierId, bankAccountId, paymentMethod, paymentDate,
    isRecurring, recurrenceFrequency, recurrenceEndDate, recipientUserId
  } = req.body;

  try {
    const transaction = await prisma.$transaction(async (tx) => {
      const t = await tx.financialTransaction.create({
        data: {
          description,
          amount: parseFloat(amount),
          type, // INCOME ou EXPENSE
          dueDate: new Date(dueDate),
          status: status || 'PENDING',
          paymentMethod,
          paymentDate: paymentDate ? new Date(paymentDate) : null,
          restaurant: { connect: { id: restaurantId } },
          ...(categoryId && { category: { connect: { id: categoryId } } }),
          ...(supplierId && { supplier: { connect: { id: supplierId } } }),
          ...(bankAccountId && { bankAccount: { connect: { id: bankAccountId } } }),
          ...(recipientUserId && { recipientUser: { connect: { id: recipientUserId } } }),
          isRecurring: !!isRecurring,
          recurrenceFrequency,
          recurrenceEndDate: recurrenceEndDate ? new Date(recurrenceEndDate) : null
        }
      });

      // Se a conta estiver paga e houver conta bancária, atualiza saldo
      if (t.status === 'PAID' && bankAccountId) {
        const adjustment = t.type === 'INCOME' ? t.amount : -t.amount;
        await tx.bankAccount.update({
          where: { id: bankAccountId },
          data: { balance: { increment: adjustment } }
        });
      }

      return t;
    });

    res.status(201).json(transaction);
  } catch (error) {
    console.error('Erro ao criar transação:', error);
    res.status(500).json({ error: 'Erro ao criar transação.' });
  }
};

// Atualizar Transação (Baixar conta, editar valor)
exports.updateTransaction = async (req, res) => {
  const { id } = req.params;
  const { 
    description, amount, dueDate, status, 
    categoryId, supplierId, bankAccountId, paymentMethod, paymentDate,
    isRecurring, recurrenceFrequency, recurrenceEndDate
  } = req.body;

  try {
    const transaction = await prisma.$transaction(async (tx) => {
      // 1. Busca a transação antiga para reverter o saldo
      const oldT = await tx.financialTransaction.findUnique({ where: { id } });
      if (!oldT) throw new Error('Lançamento não encontrado');

      // 2. Se a antiga estava PAGA, reverte o efeito no saldo
      if (oldT.status === 'PAID' && oldT.bankAccountId) {
        const reverseAdjustment = oldT.type === 'INCOME' ? -oldT.amount : oldT.amount;
        await tx.bankAccount.update({
          where: { id: oldT.bankAccountId },
          data: { balance: { increment: reverseAdjustment } }
        });
      }

      // 3. Atualiza a transação
      const updated = await tx.financialTransaction.update({
        where: { id },
        data: {
          description,
          amount: parseFloat(amount),
          dueDate: new Date(dueDate),
          status,
          paymentMethod,
          paymentDate: paymentDate ? new Date(paymentDate) : null,
          categoryId: categoryId || null,
          supplierId: supplierId || null,
          bankAccountId: bankAccountId || null,
          isRecurring: isRecurring !== undefined ? isRecurring : undefined,
          recurrenceFrequency,
          recurrenceEndDate: recurrenceEndDate ? new Date(recurrenceEndDate) : null
        }
      });

      // 4. Se a nova está PAGA, aplica o novo efeito no saldo
      if (updated.status === 'PAID' && updated.bankAccountId) {
        const newAdjustment = updated.type === 'INCOME' ? updated.amount : -updated.amount;
        await tx.bankAccount.update({
          where: { id: updated.bankAccountId },
          data: { balance: { increment: newAdjustment } }
        });
      }

      return updated;
    });

    res.json(transaction);
  } catch (error) {
    console.error('Erro ao atualizar transação:', error);
    res.status(500).json({ error: 'Erro ao atualizar transação.' });
  }
};

exports.createTransfer = async (req, res) => {
    const { restaurantId } = req.user;
    const { fromAccountId, toAccountId, amount, date, description } = req.body;

    if (!fromAccountId || !toAccountId || !amount) {
        return res.status(400).json({ error: "Dados incompletos para transferência." });
    }

    try {
        await prisma.$transaction(async (tx) => {
            const transferDate = date ? new Date(date) : new Date();

            // 1. Saída da Origem
            const debit = await tx.financialTransaction.create({
                data: {
                    description: `TRANSF. SAÍDA: ${description || 'Transferência'}`,
                    amount: parseFloat(amount),
                    type: 'EXPENSE',
                    status: 'PAID',
                    dueDate: transferDate,
                    paymentDate: transferDate,
                    restaurantId,
                    bankAccountId: fromAccountId,
                    paymentMethod: 'transfer'
                }
            });

            // 2. Entrada no Destino
            const credit = await tx.financialTransaction.create({
                data: {
                    description: `TRANSF. ENTRADA: ${description || 'Transferência'}`,
                    amount: parseFloat(amount),
                    type: 'INCOME',
                    status: 'PAID',
                    dueDate: transferDate,
                    paymentDate: transferDate,
                    restaurantId,
                    bankAccountId: toAccountId,
                    paymentMethod: 'transfer',
                    relatedTransactionId: debit.id // Vincula
                }
            });
            
            // Atualiza o debit para linkar de volta (opcional, mas bom)
            await tx.financialTransaction.update({
                where: { id: debit.id },
                data: { relatedTransactionId: credit.id }
            });

            // 3. Atualizar Saldos
            await tx.bankAccount.update({
                where: { id: fromAccountId },
                data: { balance: { decrement: parseFloat(amount) } }
            });

            await tx.bankAccount.update({
                where: { id: toAccountId },
                data: { balance: { increment: parseFloat(amount) } }
            });
        });

        res.status(201).json({ success: true });
    } catch (error) {
        console.error("Erro na transferência:", error);
        res.status(500).json({ error: "Erro ao processar transferência." });
    }
};

exports.syncRecurring = async (req, res) => {
    const { restaurantId } = req.user;
    
    try {
        const activeRecurring = await prisma.financialTransaction.findMany({
            where: {
                restaurantId,
                isRecurring: true,
                parentTransactionId: null, // Pega apenas os "pais" (templates)
                OR: [
                    { recurrenceEndDate: null },
                    { recurrenceEndDate: { gte: new Date() } }
                ]
            },
            include: {
                childTransactions: {
                    orderBy: { dueDate: 'desc' },
                    take: 1
                }
            }
        });

        const generated = [];

        for (const t of activeRecurring) {
            let lastDate = t.childTransactions.length > 0 
                ? t.childTransactions[0].dueDate 
                : t.dueDate;
            
            const nextDate = new Date(lastDate);
            const today = new Date();
            const limitDate = new Date();
            limitDate.setDate(today.getDate() + 45); // Gera até 45 dias pra frente

            // Evita loop infinito
            let safety = 0;

            while (nextDate < limitDate && safety < 12) {
                // Incrementa data
                if (t.recurrenceFrequency === 'WEEKLY') nextDate.setDate(nextDate.getDate() + 7);
                else if (t.recurrenceFrequency === 'MONTHLY') nextDate.setMonth(nextDate.getMonth() + 1);
                else if (t.recurrenceFrequency === 'YEARLY') nextDate.setFullYear(nextDate.getFullYear() + 1);
                else break;

                // Verifica se passou do fim da recorrência
                if (t.recurrenceEndDate && nextDate > t.recurrenceEndDate) break;

                // Se a data calculada ainda estiver dentro do limite (ex: hoje + 45 dias)
                // e for maior que a última data gerada
                if (nextDate <= limitDate && nextDate > lastDate) {
                     const newTrans = await prisma.financialTransaction.create({
                         data: {
                             description: t.description,
                             amount: t.amount,
                             type: t.type,
                             status: 'PENDING',
                             dueDate: new Date(nextDate),
                             restaurantId: t.restaurantId,
                             categoryId: t.categoryId,
                             supplierId: t.supplierId,
                             bankAccountId: t.bankAccountId, // Assume a mesma conta prevista
                             isRecurring: false, // O filho não é um template recorrente
                             parentTransactionId: t.id
                         }
                     });
                     generated.push(newTrans);
                     lastDate = new Date(nextDate); // Atualiza para o próximo loop
                } else if (nextDate > limitDate) {
                    break;
                }
                safety++;
            }
        }

        res.json({ generatedCount: generated.length, generated });
    } catch (error) {
        console.error("Erro ao sincronizar recorrências:", error);
        res.status(500).json({ error: "Erro ao sincronizar recorrências." });
    }
};

exports.deleteTransaction = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.$transaction(async (tx) => {
      const t = await tx.financialTransaction.findUnique({ where: { id } });
      if (t && t.status === 'PAID' && t.bankAccountId) {
        const reverseAdjustment = t.type === 'INCOME' ? -t.amount : t.amount;
        await tx.bankAccount.update({
          where: { id: t.bankAccountId },
          data: { balance: { increment: reverseAdjustment } }
        });
      }
      await tx.financialTransaction.delete({ where: { id } });
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar transação.' });
  }
};
