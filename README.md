# FM Transportes Automacao

Sistema de automacao para solicitar fretes na FM Transportes, integrando pedidos do Tiny ERP.

## Arquitetura

```
Frontend (fm-web)          Backend (fm-cli)           Integracoes
[Next.js 16]  ---------> [NestJS] ---------------> [Tiny ERP]
                            |
                            +--------------------> [FM Transportes API]
```

## Componentes

### fm-cli (Backend NestJS)
- **Port:** 3031 (prod), 3001 (local)
- **Endpoints:**
  - `GET /pedidos/hoje/fmtransportes` - Lista pedidos do Tiny filtrados por "FM TRANSPORT"
  - `POST /enviar` - Envia pedidos para FM Transportes
  - `GET /health` - Status das conexoes

### fm-web (Frontend Next.js)
- **Port:** 3030 (prod), 3000 (local)
- Interface para selecionar e enviar pedidos

## Configuracao

### Variaveis de Ambiente (fm-cli)
```env
FM_API_URL=https://integration.fmtransportes.com.br/api
FM_API_USER=apikey
FM_API_PASSWORD=<senha>
FM_CLIENT_DOCUMENT=<cnpj>
TINY_API_URL=http://tiny.sdebot.top:3011/api/tiny
```

### Variaveis de Ambiente (fm-web)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Deploy

### Docker Compose
```bash
docker compose up -d --build
```

### Portas
| Servico | Container | Host |
|---------|-----------|------|
| fm-cli  | 3001      | 3031 |
| fm-web  | 3000      | 3030 |

## API FM Transportes

### Endpoints Utilizados
- `POST /v1/order` - Solicitar frete (servico 7022 - Standard)
- `POST /v1/quote` - Cotacao de frete
- `POST /v1/label` - Solicitar etiqueta
- `GET /v1/label/{id}` - Baixar etiqueta PDF

### Autenticacao
HTTP Basic Auth (usuario:senha)

## Fluxo

1. Usuario acessa frontend
2. Sistema lista pedidos do Tiny (filtro FM TRANSPORT)
3. Usuario seleciona pedidos
4. Sistema envia para FM Transportes (POST /v1/order)
5. Recebe trackingCode para cada pedido

## Status

- [x] MVP 1: Envio de Pedidos
- [ ] MVP 2: Download de Etiquetas
- [ ] MVP 3: Declaracao de Conteudo

## Tecnologias

- NestJS 10
- Next.js 16
- TypeScript 5
- Docker
- Axios

## Autor

Setor da Embalagem - 2025
