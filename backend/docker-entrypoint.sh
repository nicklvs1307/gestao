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

# Executa as migrações
echo "Executando migrações do Prisma..."
npx prisma migrate deploy

# Inicia a aplicação
echo "Iniciando a aplicação..."
exec node index.js