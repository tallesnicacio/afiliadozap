FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src/ ./src/

# Diretórios de dados e logs (volumes externos em produção)
RUN mkdir -p data logs

EXPOSE 3500

CMD ["node", "src/index.js"]
