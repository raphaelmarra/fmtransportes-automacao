# FM-CLI API Reference

Base URL: `https://fm.sdebot.top/api`

---

## Health Check

### GET /health

Verifica status de todas as dependencias.

**Response 200:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-30T10:00:00.000Z",
  "services": {
    "fmtransportes": "healthy",
    "tiny": "healthy",
    "database": "healthy"
  }
}
```

**Status possiveis:**
- `healthy` - Todos os servicos operacionais
- `degraded` - Um ou mais servicos com problemas
- `unhealthy` - Servico critico fora

---

## Pedidos

### GET /pedidos/hoje/fmtransportes

Retorna pedidos do dia atual com situacao "Faturado" filtrados para FM Transportes.

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": 123456789,
      "numero": "12345",
      "dataPedido": "30/12/2025",
      "cliente": {
        "nome": "Cliente Exemplo",
        "cpfCnpj": "12345678000190",
        "telefone": "11999999999"
      },
      "endereco": {
        "logradouro": "Rua Exemplo",
        "numero": "100",
        "bairro": "Centro",
        "cidade": "Sao Paulo",
        "uf": "SP",
        "cep": "01000-000"
      },
      "volumes": 1,
      "peso": "2.5",
      "valorTotal": "150.00",
      "trackingCode": "FM123456789"
    }
  ],
  "total": 1
}
```

### GET /pedidos/detalhes/:idPedido

Retorna detalhes completos de um pedido especifico.

**Parameters:**
- `idPedido` (path) - ID do pedido no Tiny ERP

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": 123456789,
    "numero": "12345",
    "situacao": "Faturado",
    "dataPedido": "30/12/2025",
    "cliente": { ... },
    "itens": [
      {
        "descricao": "Produto X",
        "quantidade": 2,
        "valorUnitario": "75.00"
      }
    ],
    "frete": {
      "transportadora": "FM TRANSPORTES",
      "valorFrete": "25.00",
      "trackingCode": "FM123456789"
    }
  }
}
```

---

## Etiquetas

### POST /etiquetas

Gera etiquetas de entrega para os codigos de rastreio informados.

**Request Body:**
```json
{
  "trackingCodes": ["FM123456789", "FM987654321"]
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "labels": [
      {
        "trackingCode": "FM123456789",
        "labelId": "abc123",
        "url": "https://integration.fmtransportes.com.br/labels/abc123.pdf",
        "status": "generated"
      }
    ],
    "pdfs": [
      {
        "trackingCode": "FM123456789",
        "base64": "JVBERi0xLjQK..."
      }
    ]
  },
  "generated": 1,
  "failed": 0
}
```

**Response 400:**
```json
{
  "success": false,
  "error": "trackingCodes deve ser um array nao vazio"
}
```

**Response 500:**
```json
{
  "success": false,
  "error": "Falha ao gerar etiqueta",
  "details": "Codigo de rastreio nao encontrado"
}
```

### POST /etiquetas/com-anotacao

Gera etiquetas com anotacao adicional (observacao do cliente).

**Request Body:**
```json
{
  "trackingCodes": ["FM123456789"],
  "anotacao": "Entregar no periodo da tarde"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "labels": [...],
    "pdfs": [...],
    "anotacao": "Entregar no periodo da tarde"
  }
}
```

### GET /etiquetas/:labelId

Baixa uma etiqueta especifica pelo ID.

**Parameters:**
- `labelId` (path) - ID da etiqueta retornado na geracao

**Response 200:**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="etiqueta-{labelId}.pdf"

[PDF binary data]
```

---

## Rastreio

### GET /rastreio/:codigo

Consulta status de rastreamento de uma entrega.

**Parameters:**
- `codigo` (path) - Codigo de rastreio FM

**Response 200:**
```json
{
  "success": true,
  "data": {
    "trackingCode": "FM123456789",
    "status": "em_transito",
    "statusDescricao": "Em transito para entrega",
    "eventos": [
      {
        "data": "2025-12-30T08:00:00.000Z",
        "descricao": "Objeto coletado",
        "local": "Sao Paulo - SP"
      },
      {
        "data": "2025-12-30T10:00:00.000Z",
        "descricao": "Em transito",
        "local": "Sao Paulo - SP"
      }
    ],
    "previsaoEntrega": "2025-12-30T18:00:00.000Z"
  }
}
```

**Status possiveis:**
- `coletado` - Objeto coletado
- `em_transito` - Em transito para entrega
- `em_rota` - Saiu para entrega
- `entregue` - Entrega realizada
- `devolvido` - Devolvido ao remetente
- `extraviado` - Objeto extraviado

---

## Coletas

### POST /coletas/solicitar

Solicita coleta de volumes no endereco de origem.

**Request Body:**
```json
{
  "dataColeta": "2025-12-31",
  "horarioInicio": "09:00",
  "horarioFim": "12:00",
  "volumes": 5,
  "pesoTotal": "10.5",
  "observacao": "Caixas frageis"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "coletaId": "COL123456",
    "status": "agendada",
    "dataColeta": "2025-12-31",
    "horario": "09:00 - 12:00"
  }
}
```

### GET /coletas/status/:coletaId

Consulta status de uma coleta agendada.

**Parameters:**
- `coletaId` (path) - ID da coleta

**Response 200:**
```json
{
  "success": true,
  "data": {
    "coletaId": "COL123456",
    "status": "realizada",
    "dataColeta": "2025-12-31",
    "volumesColetados": 5
  }
}
```

---

## Codigos de Erro

| Codigo | Descricao |
|--------|-----------|
| 400 | Bad Request - Parametros invalidos |
| 401 | Unauthorized - Credenciais FM invalidas |
| 404 | Not Found - Recurso nao encontrado |
| 500 | Internal Server Error - Erro no servidor |
| 502 | Bad Gateway - Erro na comunicacao com FM API |
| 503 | Service Unavailable - Dependencia indisponivel |

---

## Autenticacao

Esta API nao requer autenticacao para consumidores internos (fm-web, n8n).

A autenticacao com FM Transportes API e feita internamente via Basic Auth:
- Header: `Authorization: Basic base64(user:password)`
- Configurado via `FM_API_USER` e `FM_API_PASSWORD`

---

## Rate Limits

- FM Transportes API: 100 req/min
- Tiny ERP API: 60 req/min

A API implementa retry automatico com backoff exponencial.

---

## Exemplos cURL

```bash
# Health check
curl https://fm.sdebot.top/api/health

# Pedidos do dia
curl https://fm.sdebot.top/api/pedidos/hoje/fmtransportes

# Gerar etiquetas
curl -X POST https://fm.sdebot.top/api/etiquetas \
  -H "Content-Type: application/json" \
  -d '{"trackingCodes": ["FM123456789"]}'

# Rastrear entrega
curl https://fm.sdebot.top/api/rastreio/FM123456789
```

---

## Changelog

### v1.0.0 (2025-12-30)
- Documentacao inicial
- Endpoints: health, pedidos, etiquetas, rastreio, coletas
