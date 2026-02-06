FROM node:20-alpine

WORKDIR /app

# Instala dependências do sistema necessárias para o Prisma, builds e healthcheck
RUN apk add --no-cache openssl curl

# Copia arquivos de dependência (caminhos relativos à raiz do projeto)
COPY backend/package*.json ./
COPY backend/prisma ./prisma/

# Instala dependências e gera o Prisma Client
RUN npm ci
RUN npx prisma generate

# Copia o resto do código do backend
COPY backend/ .

# Configura o script de entrada
COPY backend/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expõe a porta
EXPOSE 3001

# Define o Entrypoint para gerenciar secrets e migrações
ENTRYPOINT ["docker-entrypoint.sh"]