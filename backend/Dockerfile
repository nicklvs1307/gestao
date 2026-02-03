FROM node:20-alpine

WORKDIR /app

# Instala dependências do sistema necessárias para o Prisma e builds
RUN apk add --no-cache openssl

# Copia arquivos de dependência
COPY package*.json ./
COPY prisma ./prisma/

# Instala dependências e gera o Prisma Client
RUN npm ci
RUN npx prisma generate

# Copia o resto do código
COPY . .

# Configura o script de entrada
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expõe a porta
EXPOSE 3001

# Define o Entrypoint para gerenciar secrets e migrações
ENTRYPOINT ["docker-entrypoint.sh"]
