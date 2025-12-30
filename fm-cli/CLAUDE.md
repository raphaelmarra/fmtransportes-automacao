# FM-CLI

**API REST para integracao FM Transportes + Tiny ERP**

Porta: 3001 (interna) / 3021 (externa) | Dominio: `fm.sdebot.top`

---

## Arquitetura

```
src/
├── api/                    # Controllers REST
│   ├── pedidos.controller.ts      # GET /pedidos/*
│   ├── etiquetas.controller.ts    # POST /etiquetas
│   ├── rastreio.controller.ts     # GET /rastreio/:codigo
│   └── health.controller.ts       # GET /health
├── integrations/
│   ├── fmtransportes/      # FM Transportes API
│   │   ├── fm.service.ts          # Core: etiquetas, coletas
│   │   └── fm.module.ts
│   └── tiny/               # Tiny ERP API
│       ├── tiny.service.ts        # Pedidos, detalhes
│       └── tiny.module.ts
└── main.ts                 # Bootstrap porta 3001
```

## Endpoints Principais

| Metodo | Rota | Funcao |
|--------|------|--------|
| GET | `/health` | Health check com status de dependencias |
| GET | `/pedidos/hoje/fmtransportes` | Pedidos do dia via Tiny |
| POST | `/etiquetas` | Gerar etiquetas FM (aceita trackingCodes[]) |
| POST | `/etiquetas/com-anotacao` | Gerar etiquetas com anotacao cliente |
| GET | `/rastreio/:codigo` | Rastrear entrega |

## Dependencias Externas

| Servico | URL | Auth |
|---------|-----|------|
| FM Transportes | `https://integration.fmtransportes.com.br/api` | Basic Auth |
| Tiny ERP | `http://tiny.sdebot.top:3011/api/tiny` | Token interno |
| PostgreSQL | `sql.sdebot.top:5432` | User/Pass |

**IMPORTANTE:** Usar URL externa para Tiny (`tiny.sdebot.top`), NAO hostname Docker (`tiny-cli`). Estao em redes diferentes.

## Variaveis de Ambiente

```env
# Obrigatorias
PORT=3001
FM_API_URL=https://integration.fmtransportes.com.br/api
FM_API_USER=apikey
FM_API_PASSWORD=***
FM_CLIENT_DOCUMENT=27367445000160

# Tiny ERP (URL EXTERNA obrigatorio)
TINY_API_URL=http://tiny.sdebot.top:3011/api/tiny

# Database
DB_HOST=sql.sdebot.top
DB_PORT=5432
DB_USER=sde_admin
DB_PASSWORD=***
DB_NAME=fretes_sde
```

## Fluxo de Geracao de Etiquetas

```
1. Frontend chama POST /etiquetas { trackingCodes: ["ABC123"] }
2. fm-cli valida trackingCodes
3. fm-cli chama FM API: POST /collect-order/labels
4. FM retorna { labels: [{ labelId, url }] }
5. fm-cli baixa PDF de cada url
6. fm-cli retorna { labels: [...], pdfs: [base64...] }
```

## Health Check Response

```json
{
  "status": "healthy",
  "services": {
    "fmtransportes": "healthy",
    "tiny": "healthy",
    "database": "healthy"
  }
}
```

Status possiveis: `healthy`, `degraded`, `unhealthy`

## Erros Comuns

| Erro | Causa | Solucao |
|------|-------|---------|
| `getaddrinfo EAI_AGAIN tiny-cli` | TINY_API_URL com hostname Docker | Usar URL externa |
| `401 Unauthorized` FM | Credenciais FM invalidas | Verificar FM_API_PASSWORD |
| `ECONNREFUSED 3011` | tiny-cli parado | `docker start tiny-cli` |

## Deploy

```bash
# Na VPS
cd /opt/fmtransportes-automacao
docker compose up -d --build fm-cli

# Verificar
curl https://fm.sdebot.top/api/health
```

## Arquivos de Referencia

- `docker-compose.yml` - Configuracao de deploy
- `src/integrations/fmtransportes/fm.service.ts` - Logica FM
- `src/integrations/tiny/tiny.service.ts` - Logica Tiny
- `/infraestrutura/vps-registry.yaml` - SSOT da VPS

---
**v1.0** | 30/12/2025
