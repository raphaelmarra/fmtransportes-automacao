# FM-CLI

API REST NestJS para integracao com FM Transportes e Tiny ERP.

## Funcionalidades

- Geracao de etiquetas de entrega FM Transportes
- Consulta de pedidos via Tiny ERP
- Rastreamento de entregas
- Health check com status de dependencias

## Requisitos

- Node.js 18+
- Docker (para deploy)
- Acesso a FM Transportes API
- Acesso a Tiny ERP (tiny-cli)

## Instalacao

```bash
# Clonar repositorio
git clone https://github.com/raphaelmarra/fmtransportes-automacao.git
cd fmtransportes-automacao/fm-cli

# Instalar dependencias
npm install

# Copiar arquivo de ambiente
cp .env.example .env
# Editar .env com suas credenciais
```

## Configuracao

Criar arquivo `.env` na raiz do projeto:

```env
# Servidor
PORT=3001
NODE_ENV=development

# FM Transportes API
FM_API_URL=https://integration.fmtransportes.com.br/api
FM_API_USER=apikey
FM_API_PASSWORD=sua_api_key_aqui
FM_CLIENT_DOCUMENT=seu_cnpj_aqui

# Tiny ERP
# IMPORTANTE: Em producao, usar URL externa (tiny.sdebot.top)
# NAO usar hostname Docker (tiny-cli) se estiverem em redes diferentes
TINY_API_URL=http://localhost:3011/api/tiny

# Database (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_USER=sde_admin
DB_PASSWORD=sua_senha_aqui
DB_NAME=fretes_sde

# CORS
CORS_ORIGINS=http://localhost:3000
```

## Executando

### Desenvolvimento

```bash
# Modo desenvolvimento com hot reload
npm run start:dev

# Modo debug
npm run start:debug
```

### Producao

```bash
# Build
npm run build

# Executar
npm run start:prod
```

### Docker

```bash
# Build e executar com docker-compose
docker compose up -d --build fm-cli

# Ver logs
docker logs fm-cli -f

# Verificar status
curl http://localhost:3021/api/health
```

## Estrutura do Projeto

```
fm-cli/
├── src/
│   ├── api/                    # Controllers REST
│   │   ├── pedidos.controller.ts
│   │   ├── etiquetas.controller.ts
│   │   ├── rastreio.controller.ts
│   │   └── health.controller.ts
│   ├── integrations/
│   │   ├── fmtransportes/      # Integracao FM Transportes
│   │   │   ├── fm.service.ts
│   │   │   └── fm.module.ts
│   │   └── tiny/               # Integracao Tiny ERP
│   │       ├── tiny.service.ts
│   │       └── tiny.module.ts
│   ├── app.module.ts
│   └── main.ts
├── docs/
│   └── API.md                  # Documentacao detalhada da API
├── Dockerfile
├── docker-compose.yml
├── CLAUDE.md                   # Contexto para IA
└── README.md
```

## Deploy em Producao

### VPS (Hostinger)

```bash
# Conectar na VPS
ssh -i ~/.ssh/hostinger_vps_key root@185.137.92.39

# Navegar para diretorio
cd /opt/fmtransportes-automacao

# Pull das mudancas
git pull

# Rebuild e restart
docker compose up -d --build fm-cli

# Verificar
curl https://fm.sdebot.top/api/health
```

### URLs de Producao

| Servico | URL |
|---------|-----|
| API | https://fm.sdebot.top/api |
| Health | https://fm.sdebot.top/api/health |

## Troubleshooting

### Erro: getaddrinfo EAI_AGAIN tiny-cli

**Causa:** TINY_API_URL configurado com hostname Docker interno, mas fm-cli e tiny-cli estao em redes Docker diferentes.

**Solucao:** Usar URL externa:
```env
TINY_API_URL=http://tiny.sdebot.top:3011/api/tiny
```

### Erro: 401 Unauthorized na FM API

**Causa:** Credenciais FM invalidas ou expiradas.

**Solucao:** Verificar FM_API_PASSWORD no arquivo .env ou variaveis de ambiente do container.

### Erro: ECONNREFUSED na porta 3011

**Causa:** tiny-cli nao esta rodando.

**Solucao:**
```bash
docker start tiny-cli
curl http://tiny.sdebot.top:3011/api/tiny/info
```

## Integracao com Frontend

O frontend (fm-web) consome esta API via:

```javascript
// Configurado via NEXT_PUBLIC_API_URL
const API_URL = 'https://fm.sdebot.top/api';

// Exemplo: buscar pedidos do dia
const response = await fetch(`${API_URL}/pedidos/hoje/fmtransportes`);
const pedidos = await response.json();

// Exemplo: gerar etiquetas
const response = await fetch(`${API_URL}/etiquetas`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ trackingCodes: ['ABC123', 'DEF456'] })
});
```

## Contribuindo

1. Criar branch: `git checkout -b feature/nome-da-feature`
2. Commitar: `git commit -m "feat: descricao"`
3. Push: `git push origin feature/nome-da-feature`
4. Abrir Pull Request

## Licenca

Proprietario - Setor da Embalagem

## Contato

- Repositorio: https://github.com/raphaelmarra/fmtransportes-automacao
- Documentacao VPS: `infraestrutura/vps-registry.yaml`
