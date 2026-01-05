FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# IMPORTANTE: URL da API eh definida via docker-compose.yml (build args)
# NUNCA hardcode a URL aqui! Sempre use ARG do docker-compose
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Validacao: falha o build se URL estiver errada ou vazia
RUN if [ -z "$NEXT_PUBLIC_API_URL" ]; then \
      echo "ERRO: NEXT_PUBLIC_API_URL nao definida! Use docker-compose build." && exit 1; \
    fi && \
    if echo "$NEXT_PUBLIC_API_URL" | grep -q "fm-api.sdebot.top"; then \
      echo "ERRO: URL incorreta 'fm-api.sdebot.top'! Use 'fm.sdebot.top/api'" && exit 1; \
    fi && \
    if ! echo "$NEXT_PUBLIC_API_URL" | grep -q "fm.sdebot.top/api"; then \
      echo "AVISO: URL nao parece ser producao: $NEXT_PUBLIC_API_URL"; \
    fi && \
    echo "URL da API: $NEXT_PUBLIC_API_URL"

RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
