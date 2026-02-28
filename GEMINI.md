# 🚨 GEMINI CLI - PROTOCOLO DE SEGURANÇA E MANUTENÇÃO (2026)

## ⚠️ PROIBIÇÕES ABSOLUTAS (BANCO DE DADOS)

1.  **NUNCA Criar Migrações Manuais para Tabelas Prisma (`_*`):**
    *   **ERRO CRÍTICO:** Tentar criar tabelas de relacionamento Many-to-Many (`_CategoryToProduct`, `_AddonGroupToProduct`) via SQL manual dentro de uma migração.
    *   **MOTIVO:** O Prisma gerencia essas tabelas internamente. Criá-las manualmente causa conflito de "Table already exists" e quebra a sincronização em produção.
    *   **SOLUÇÃO:** Sempre definir as relações no `schema.prisma` e deixar o comando `prisma migrate dev` gerar o SQL correto.

2.  **NUNCA Corrigir Migrações Falhas com "Remendos":**
    *   Se uma migração falhar em produção, **NÃO crie uma nova migração** para tentar consertar o erro da anterior.
    *   **AÇÃO CORRETA:** Reverter a migração localmente, corrigir o `schema.prisma`, excluir a pasta da migração falha e gerar uma nova limpa.

3.  **VERIFICAÇÃO OBRIGATÓRIA (PRÉ-PUSH):**
    *   Antes de enviar para a VPS, rodar `npx prisma migrate dev` em um banco local limpo para garantir que a migração não tem conflitos de nomes.

## 🛠️ PROCEDIMENTO DE RECUPERAÇÃO DE DESASTRE (DRIFT)

Se o banco de produção entrar em estado inconsistente (tabelas existem mas Prisma não sabe):
1.  **NÃO RODE** `prisma migrate deploy` (vai falhar).
2.  Use `prisma migrate resolve --applied <NOME_DA_MIGRACAO>` para marcar como resolvida.
3.  Se necessário, remova os registros sujos da tabela `_prisma_migrations` via SQL direto.

## 🏗️ ARQUITETURA ATUAL (ERP SAIPOS)

*   **Padrão de Tabelas:** O banco segue o padrão industrial Saipos.
*   **Colunas Obrigatórias:** `saiposIntegrationCode`, `showInMenu`, `isFlavor`.
*   **Tabelas Críticas:** `_CategoryToProduct` (Muitos-para-Muitos).

---
**Última Atualização:** 28/02/2026 - Pós-Incidente de Migração Manual
