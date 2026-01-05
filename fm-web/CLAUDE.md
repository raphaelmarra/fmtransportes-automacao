# FM-Web

**Parte de:** [`../CLAUDE.md`](../CLAUDE.md) (fmtransportes-automacao)

Frontend Next.js para gerenciamento de envios FM Transportes. Interface para selecionar pedidos, enviar para transportadora, gerar etiquetas e monitorar entregas.

## Stack

| Item | Valor |
|------|-------|
| Framework | Next.js 16 (App Router) |
| React | 19.x |
| UI | Tailwind CSS 4 + Radix UI |
| PDF | pdf-lib (combinar etiquetas) |
| Porta interna | 3000 |
| Porta externa | 3020 |
| Dominio | `fm.sdebot.top` |

## Paginas

| Rota | Funcao |
|------|--------|
| `/` | Lista pedidos do dia, selecao, envio e etiquetas |
| `/monitoramento` | Dashboard de acompanhamento de entregas |

## Funcionalidades

### Pagina Principal (`/`)

1. **Listar Pedidos** - Carrega pedidos do dia filtrados para FM Transportes
2. **Selecionar** - Checkbox para selecionar multiplos pedidos
3. **Enviar** - Envia pedidos selecionados para FM Transportes
4. **Gerar Etiquetas** - Gera PDFs das etiquetas em formato 10x15
5. **Combinar PDFs** - Une multiplas etiquetas em um unico PDF

### Pagina Monitoramento (`/monitoramento`)

1. **Listar Envios** - Todos os envios com status
2. **Alertas** - Envios parados ha mais de 24h
3. **Detalhes** - Historico de eventos de cada envio
4. **Atualizar** - Refresh manual do tracking

## Arquitetura

```
src/
├── app/
│   ├── layout.tsx          # Layout raiz
│   ├── page.tsx            # Pagina principal (14KB)
│   ├── globals.css         # Estilos globais
│   └── monitoramento/
│       └── page.tsx        # Dashboard monitoramento
├── lib/
│   ├── api.ts              # Cliente API (fetch wrapper)
│   ├── utils.ts            # Formatadores (moeda, data)
│   └── pdf-utils.ts        # Manipulacao PDFs 10x15
└── components/             # (vazio - inline no page.tsx)
```

## API Client

```typescript
// src/lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://fm.sdebot.top/api';

// Endpoints consumidos:
GET  /pedidos/hoje/fmtransportes  → buscarPedidosFMTransportes()
POST /enviar                      → enviarPedidos(pedidoIds[])
POST /etiquetas                   → gerarEtiquetas(trackingCodes[])
GET  /monitoramento               → listarEnvios()
GET  /monitoramento/alertas       → listarAlertas()
POST /monitoramento/atualizar     → atualizarTodos()
```

## Variaveis de Ambiente

```env
# Build time (definido no docker-compose.yml args)
NEXT_PUBLIC_API_URL=https://fm.sdebot.top/api
```

## Desenvolvimento

```bash
# Instalar
npm install

# Rodar local (conecta com API de producao)
npm run dev

# Build
npm run build

# Produção
npm start
```

## Deploy

Via docker-compose no projeto pai:

```bash
cd /opt/fm-transportes
docker compose up -d --build fm-web
```

## Dependencias Principais

| Pacote | Uso |
|--------|-----|
| next | Framework React |
| tailwindcss | Estilizacao |
| @radix-ui/* | Componentes UI |
| pdf-lib | Manipulacao de PDFs |
| lucide-react | Icones |

## Fluxo de Usuario

```
1. Usuario acessa https://fm.sdebot.top
2. Sistema carrega pedidos do dia automaticamente
3. Usuario seleciona pedidos desejados
4. Usuario clica "Enviar para FM"
5. Sistema mostra resultados (sucesso/falha)
6. Usuario clica "Gerar Etiquetas"
7. PDF abre em nova aba (formato 10x15)
8. Usuario imprime etiquetas
```

## Notas de Implementacao

- **SSR desabilitado:** Paginas usam `'use client'` (client-side only)
- **State local:** useState para gerenciar selecao e loading
- **PDF 10x15:** Etiquetas combinadas em layout de impressora termica
- **Sem autenticacao:** Sistema interno, acesso via VPN/rede

## ALERTA CRITICO - URL da API

**NUNCA edite o Dockerfile para adicionar URLs hardcoded!**

| URL | Status |
|-----|--------|
| `https://fm.sdebot.top/api` | CORRETA |
| `https://fm-api.sdebot.top` | ERRADA - dominio NAO EXISTE |
| `http://localhost:3001` | Apenas desenvolvimento local |

A URL da API eh definida APENAS no `docker-compose.yml`:
```yaml
fm-web:
  build:
    args:
      - NEXT_PUBLIC_API_URL=https://fm.sdebot.top/api  # <-- AQUI
```

O Dockerfile tem validacao que FALHA o build se:
1. URL estiver vazia
2. URL contiver `fm-api.sdebot.top` (erro comum)

Se der erro "Failed to fetch" no browser:
1. Verifique `docker-compose.yml` -> args -> NEXT_PUBLIC_API_URL
2. Rebuild: `docker compose up -d --build --no-deps fm-web`
3. Verifique o bundle: `docker exec fm-web grep -r "sdebot" /app/.next/static/chunks/`

---
**Versao:** 3.0 | **Atualizado:** 2026-01-05
