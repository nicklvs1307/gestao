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

# Expõe a porta
EXPOSE 3001

# Comando de inicialização (garante que as migrações rodem antes de iniciar)
CMD ["sh", "-c", "npx prisma migrate deploy && node index.js"]
