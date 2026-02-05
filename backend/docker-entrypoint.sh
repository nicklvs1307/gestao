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

# Aguarda o banco de dados estar pronto (evita falha na inicialização)
echo "Aguardando banco de dados responder..."
MAX_RETRIES=30
COUNT=0
until npx prisma db pull --print > /dev/null 2>&1 || [ $COUNT -eq $MAX_RETRIES ]; do
  sleep 2
  COUNT=$((COUNT + 1))
  echo "Tentativa $COUNT de $MAX_RETRIES..."
done

if [ $COUNT -eq $MAX_RETRIES ]; then
  echo "Erro: Banco de dados não respondeu após $MAX_RETRIES tentativas."
  exit 1
fi

# Aplica migrações pendentes de forma segura
echo "Sincronizando Banco de Dados com o Schema..."
npx prisma migrate deploy

# Executa o Seed apenas se for necessário ou de forma silenciosa
# Aqui você pode adicionar uma lógica para checar se já existe um usuário admin por exemplo
echo "Executando Seed de Permissões..."
node prisma/seed_permissions.js > /dev/null 2>&1 || echo "Aviso: Seed já executado ou falhou silenciosamente."

# Inicia a aplicação
echo "Iniciando a aplicação..."
exec node index.js
