# Stage 1: Build
FROM node:20-alpine as builder

WORKDIR /app

# Copia arquivos compartilhados
COPY shared ./shared
COPY types ./types

# Copia o projeto Client
COPY frontend/client ./frontend/client

# Instala e Compila
WORKDIR /app/frontend/client
RUN npm ci
RUN npm run build

# Stage 2: Serve com Nginx
FROM nginx:alpine

# Remove configuração padrão
RUN rm /etc/nginx/conf.d/default.conf

# Copia nossa configuração personalizada
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copia os arquivos compilados do React
COPY --from=builder /app/frontend/client/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
