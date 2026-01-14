# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-01-14

### Added
- Campo volumes editavel na secao de resultados de envio
- Validacao obrigatoria de volumes antes de gerar declaracao de conteudo
- Estado `volumesPorPedido` para armazenar valores por pedido

### Changed
- Funcao `montarDadosDeclaracao` agora aceita parametro `volumes` opcional
- Interface `DadosDeclaracao` inclui campo `volumes`

### Fixed
- Declaracoes agora usam quantidade de volumes correta (antes era fixo em 1)

## [1.0.0] - 2026-01-05

### Added
- Pagina principal com listagem de pedidos FM Transportes
- Selecao multipla de pedidos para envio
- Geracao de etiquetas em formato 10x15
- Combinacao de multiplas etiquetas em PDF unico
- Pagina de monitoramento de entregas
- Geracao de declaracoes de conteudo
- Filtro por data na listagem de pedidos

---

**Gerado automaticamente por /release**
