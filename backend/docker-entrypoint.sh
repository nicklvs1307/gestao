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
file_env 'OPENAI_API_KEY'
file_env 'EVOLUTION_API_URL'
file_env 'EVOLUTION_API_KEY'

# Aguarda o banco de dados estar pronto (evita falha na inicialização)
echo "Aguardando banco de dados responder em $DATABASE_URL..."
MAX_RETRIES=30
COUNT=0

# Extrai host e porta da URL do banco (suporta formatos comuns do Prisma/Postgres)
DB_HOST=$(echo $DATABASE_URL | sed -e 's|.*@||' -e 's|/.*||' -e 's|:.*||')
DB_PORT=$(echo $DATABASE_URL | sed -e 's|.*:||' -e 's|/.*||')
[ -z "$DB_PORT" ] && DB_PORT=5432

# Usa Node para testar a conexão TCP (mais leve que prisma db pull)
until node -e "const net = require('net'); const client = net.createConnection({host: '$DB_HOST', port: $DB_PORT}, () => client.end()); client.on('error', (e) => process.exit(1));" || [ $COUNT -eq $MAX_RETRIES ]; do
  sleep 2
  COUNT=$((COUNT + 1))
  echo "Tentativa $COUNT de $MAX_RETRIES (Buscando $DB_HOST:$DB_PORT)..."
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
