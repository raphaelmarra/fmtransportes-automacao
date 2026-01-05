# FM-CLI

**Parte de:** [`../CLAUDE.md`](../CLAUDE.md) (fmtransportes-automacao)

API REST para integracao FM Transportes + Tiny ERP. Gerencia envio de pedidos, geracao de etiquetas e monitoramento de entregas.

## Stack

| Item | Valor |
|------|-------|
| Runtime | Node.js 18+ |
| Framework | NestJS 10.x |
| Porta interna | 3001 |
| Porta externa | 3021 |
| Dominio | `fm.sdebot.top` |

## Endpoints (12 total)

### Health
| Metodo | Rota | Funcao |
|--------|------|--------|
| GET | `/health` | Status das conexoes (Tiny, FM) |

### Pedidos
| Metodo | Rota | Funcao |
|--------|------|--------|
| GET | `/pedidos/hoje/fmtransportes` | Pedidos do dia filtrados FM (aceita `?data=DD/MM/YYYY`) |
| POST | `/enviar` | Enviar pedidos para FM Transportes |

### Etiquetas
| Metodo | Rota | Funcao |
|--------|------|--------|
| POST | `/etiquetas` | Gerar etiquetas (body: `{trackingCodes:[]}`) |
| GET | `/etiquetas/:labelId` | Baixar URL de etiqueta |

### Declaracoes (MVP3)
| Metodo | Rota | Funcao |
|--------|------|--------|
| POST | `/declaracao/base64` | Gerar declaracao de conteudo (retorna PDF base64) |

### Monitoramento
| Metodo | Rota | Funcao |
|--------|------|--------|
| GET | `/monitoramento` | Listar todos os envios |
| GET | `/monitoramento/resumo` | Totais e alertas |
| GET | `/monitoramento/alertas` | Envios parados >24h |
| GET | `/monitoramento/:trackingCode` | Detalhes + historico |
| POST | `/monitoramento/atualizar` | Atualizar todos trackings |
| POST | `/monitoramento/:trackingCode/atualizar` | Atualizar tracking especifico |

## Arquitetura

```
src/
├── api/                         # Controllers REST
│   ├── health.controller.ts
│   ├── pedidos.controller.ts
│   ├── etiquetas.controller.ts
│   ├── envio.controller.ts
│   └── monitoramento.controller.ts
├── integrations/
│   ├── fmtransportes/           # FM Transportes API
│   │   ├── fm.service.ts
│   │   └── tracking.service.ts
│   └── tiny/                    # Tiny ERP
│       └── tiny.service.ts
├── core/
│   └── dto/
└── main-http.ts
```

## Dependencias Externas

| Servico | URL | Auth |
|---------|-----|------|
| FM Transportes | `https://integration.fmtransportes.com.br/api` | Basic Auth |
| Tiny ERP | `http://tiny.sdebot.top:3011/api/tiny` | Interno |
| PostgreSQL | `sql.sdebot.top:5432` | User/Pass |

## Variaveis de Ambiente

```env
# Servidor
PORT=3001

# FM Transportes
FM_API_URL=https://integration.fmtransportes.com.br/api
FM_API_USER=apikey
FM_API_PASSWORD=***
FM_CLIENT_DOCUMENT=27367445000160

# Tiny ERP (usar URL EXTERNA, nao hostname Docker)
TINY_API_URL=http://tiny.sdebot.top:3011/api/tiny

# Database
DB_HOST=sql.sdebot.top
DB_PORT=5432
DB_USER=sde_admin
DB_PASSWORD=***
DB_NAME=fretes_sde

# CORS
CORS_ORIGINS=https://fm.sdebot.top
```

## Desenvolvimento

```bash
# Instalar
npm install

# Rodar local
npm run start:dev

# Build
npm run build

# Testes
npm test
```

## Deploy

**Guia completo:** [`DEPLOY.md`](DEPLOY.md)

```bash
ssh root@185.137.92.39
cd /opt/fm-transportes
docker compose up -d --build fm-cli
curl https://fm.sdebot.top/health
```

## Erros Comuns

| Erro | Causa | Solucao |
|------|-------|---------|
| `getaddrinfo EAI_AGAIN tiny-cli` | TINY_API_URL com hostname Docker | Usar URL externa |
| `401 Unauthorized` FM | Credenciais FM invalidas | Verificar FM_API_PASSWORD |
| `ECONNREFUSED 3011` | tiny-cli parado | `docker start tiny-cli` |

---
**Versao:** 3.0 | **Atualizado:** 2026-01-05
