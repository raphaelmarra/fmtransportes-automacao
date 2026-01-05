# FM Transportes Automacao

**Descricao:** Sistema completo para envio de pedidos via FM Transportes. Integra Tiny ERP com FM Transportes API para automatizar envio, geracao de etiquetas, declaracoes de conteudo e monitoramento de entregas.

**Versao atual:** MVP 3 (Envio + Etiquetas + Declaracoes + Filtro de Datas)

## URLs Producao

| Servico | URL | Porta |
|---------|-----|-------|
| Frontend | https://fm.sdebot.top | 3020 |
| API | http://localhost:3021 (interno) | 3021 |
| Tiny ERP | http://tiny.sdebot.top:3011 | 3011 |

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        USUARIO                                  │
│                           │                                     │
│                           ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              fm-web (Next.js 16)                        │   │
│  │              https://fm.sdebot.top                      │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐   │   │
│  │  │ Selecionar  │  │   Enviar     │  │ Monitoramento │   │   │
│  │  │   Pedidos   │  │  Etiquetas   │  │   Entregas    │   │   │
│  │  │ +FiltroData │  │ +Declaracoes │  │               │   │   │
│  │  └─────────────┘  └──────────────┘  └───────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│                           ▼ HTTPS                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              fm-cli (NestJS 10)                         │   │
│  │              porta 3021                                 │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐   │   │
│  │  │  /pedidos   │  │  /etiquetas  │  │/monitoramento │   │   │
│  │  │  /enviar    │  │  /health     │  │               │   │   │
│  │  └──────┬──────┘  └──────┬───────┘  └───────┬───────┘   │   │
│  └─────────┼────────────────┼──────────────────┼───────────┘   │
│            │                │                  │                │
│            ▼                ▼                  ▼                │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │   Tiny ERP      │ │ FM Transportes  │ │   PostgreSQL    │   │
│  │   (pedidos)     │ │ (envio/labels)  │ │   (tracking)    │   │
│  │ tiny.sdebot.top │ │ integration.fm  │ │  sql.sdebot.top │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Fluxo de Dados

```
1. LISTAR PEDIDOS
   Usuario abre fm-web
   → fm-web chama GET /pedidos/hoje/fmtransportes
   → fm-cli chama Tiny ERP (busca pedidos do dia)
   → fm-cli filtra pedidos com frete FM Transportes
   → Retorna lista para fm-web

2. ENVIAR PEDIDOS
   Usuario seleciona pedidos e clica "Enviar"
   → fm-web chama POST /enviar {pedidoIds: [...]}
   → fm-cli busca detalhes dos pedidos no Tiny
   → fm-cli envia para FM Transportes API
   → FM retorna trackingCodes
   → fm-cli salva no PostgreSQL
   → Retorna resultados para fm-web

3. GERAR ETIQUETAS
   Usuario clica "Gerar Etiquetas"
   → fm-web chama POST /etiquetas {trackingCodes: [...]}
   → fm-cli chama FM API para gerar labels
   → FM retorna URLs dos PDFs
   → fm-cli baixa PDFs e retorna base64
   → fm-web combina em PDF 10x15 e abre

4. MONITORAR ENTREGAS
   Usuario acessa /monitoramento
   → fm-web chama GET /monitoramento
   → fm-cli consulta PostgreSQL (envios)
   → fm-cli consulta FM API (status atual)
   → Retorna lista com alertas

5. GERAR DECLARACOES (MVP3)
   Usuario clica "Gerar Declaracoes" apos envio
   → fm-web monta dados do pedido + tracking
   → fm-web chama POST /declaracao/base64
   → fm-cli gera PDF da declaracao
   → Retorna PDF em base64
   → fm-web abre em nova aba
```

## Subprojetos

| Subprojeto | Descricao | CLAUDE.md |
|------------|-----------|-----------|
| fm-cli | API NestJS (11 endpoints) | [`fm-cli/CLAUDE.md`](fm-cli/CLAUDE.md) |
| fm-web | Frontend Next.js | [`fm-web/CLAUDE.md`](fm-web/CLAUDE.md) |

## Deploy

**Guia completo:** [`DEPLOY.md`](DEPLOY.md)

**Quick start:**
```bash
ssh root@185.137.92.39
cd /opt/fm-transportes
docker compose up -d --build
curl https://fm.sdebot.top/health
```

## Variaveis de Ambiente

Definidas no `docker-compose.yml`:

| Variavel | Descricao |
|----------|-----------|
| FM_API_URL | URL da API FM Transportes |
| FM_API_USER | Usuario API (apikey) |
| FM_API_PASSWORD | Senha/Token API |
| FM_CLIENT_DOCUMENT | CNPJ do cliente |
| TINY_API_URL | URL externa do tiny-cli |
| DB_HOST/PORT/USER/PASSWORD/NAME | PostgreSQL |

## Integracoes Externas

| Sistema | Uso | Docs |
|---------|-----|------|
| FM Transportes | Envio, etiquetas, rastreio | https://integration.fmtransportes.com.br |
| Tiny ERP | Pedidos, clientes | via tiny-cli |
| PostgreSQL | Persistencia de envios | sql.sdebot.top |

## Decisoes Arquiteturais

**ADRs:** [`fm-cli/docs/adr/`](fm-cli/docs/adr/)

| ADR | Titulo |
|-----|--------|
| ADR-001 | NestJS como API Gateway |
| ADR-002 | URL Externa para Tiny ERP |

## Erros Comuns

| Erro | Causa | Solucao |
|------|-------|---------|
| `Failed to fetch` (browser) | URL errada no build do fm-web | Ver fm-web/CLAUDE.md - Alerta Critico |
| `getaddrinfo EAI_AGAIN` | TINY_API_URL com hostname Docker | Usar URL externa |
| `401 Unauthorized` | Credenciais FM invalidas | Verificar FM_API_PASSWORD |
| `ECONNREFUSED 3011` | tiny-cli parado | `docker start tiny-cli` |
| Frontend 404 | fm-cli parado | `docker start fm-cli` |

**IMPORTANTE:** O erro "Failed to fetch" geralmente ocorre quando o Dockerfile do fm-web tem uma URL hardcoded errada. O Dockerfile agora tem validacao que FALHA o build se a URL estiver incorreta. Ver `fm-web/CLAUDE.md` para detalhes.

## Estrutura de Arquivos

```
fmtransportes-automacao/
├── CLAUDE.md           # Este arquivo (visao geral)
├── DEPLOY.md           # Guia de deploy
├── docker-compose.yml  # Orquestracao dos containers
├── fm-cli/             # Backend NestJS
│   ├── CLAUDE.md
│   ├── DEPLOY.md
│   ├── src/
│   │   ├── api/        # Controllers
│   │   └── integrations/
│   └── docs/adr/       # Decisoes arquiteturais
└── fm-web/             # Frontend Next.js
    ├── CLAUDE.md
    └── src/
        ├── app/        # Pages
        └── lib/        # Utils e API client
```

---
**Versao:** 3.0 | **Atualizado:** 2026-01-05
