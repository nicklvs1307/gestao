#!/bin/sh
set -e

# Função para carregar segredos de forma compatível com POSIX sh
file_env() {
    var="$1"
    fileVar="${var}_FILE"
    
    # Pega o valor da variável de ambiente normal (se existir)
    eval val=\$$var
    # Pega o valor da variável _FILE (se existir)
    eval fileVal=\$$fileVar

    if [ -n "$val" ] && [ -n "$fileVal" ]; then
        echo >&2 "error: both $var and $fileVar are set (but are exclusive)"
        exit 1
    fi

    if [ -n "$val" ]; then
        export "$var"="$val"
    elif [ -n "$fileVal" ]; then
        if [ -f "$fileVal" ]; then
            export "$var"="$(cat "$fileVal")"
        else
            echo >&2 "warning: $fileVar is set but $fileVal does not exist"
        fi
    fi
    
    unset "$fileVar"
}

# Carrega os segredos
file_env 'DATABASE_URL'
file_env 'JWT_SECRET'

# Sincroniza o Schema de forma inteligente (Cria tabelas e colunas faltantes)
echo "Sincronizando Banco de Dados com o Schema..."
npx prisma db push --accept-data-loss

# Executa o Seed de Permissões e SuperAdmin original
echo "Executando Seed de Permissões e SuperAdmin..."
node prisma/seed_permissions.js || echo "Aviso: Falha ao rodar seed_permissions.js"

# Executa o Seed de Dados de Teste
echo "Executando Seed de Dados de Teste..."
npm run seed || echo "Aviso: Seed de dados de teste falhou ou já existem dados."

# Inicia a aplicação
echo "Iniciando a aplicação..."
exec node index.js
