#!/bin/sh
set -e

# Função para carregar segredos
file_env() {
   local var="$1"
   local fileVar="${var}_FILE"
   local def="${2:-}"
   if [ "${!var:-}" ] && [ "${!fileVar:-}" ]; then
      echo >&2 "error: both $var and $fileVar are set (but are exclusive)"
      exit 1
   fi
   local val="$def"
   if [ "${!var:-}" ]; then
      val="${!var}"
   elif [ "${!fileVar:-}" ]; then
      val="$(cat "${!fileVar}")"
   fi
   export "$var"="$val"
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
