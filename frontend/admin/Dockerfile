# syntax=docker/dockerfile:1
# Stage 1: Build
FROM node:20-alpine AS builder

ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

# VITE_OPENROUTE_KEY é necessária em tempo de build para o Vite injetar no código
ARG VITE_OPENROUTE_KEY
ENV VITE_OPENROUTE_KEY=$VITE_OPENROUTE_KEY

WORKDIR /app

# Copia arquivos compartilhados (Necessário pois o vite.config.ts referencia eles)
COPY shared ./shared
COPY types ./types

# Copia o projeto Admin
COPY frontend/admin ./frontend/admin

# Instala e Compila
WORKDIR /app/frontend/admin
RUN npm ci
RUN npm run build

# Stage 2: Serve com Nginx
FROM nginx:alpine

# Remove configuração padrão
RUN rm /etc/nginx/conf.d/default.conf

# Copia nossa configuração personalizada
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copia os arquivos compilados do React
COPY --from=builder /app/frontend/admin/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
