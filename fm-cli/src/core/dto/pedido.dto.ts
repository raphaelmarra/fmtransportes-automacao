// DTOs para pedidos do Tiny ERP

export interface PedidoTinyDTO {
  id: string;
  numero: string;
  numero_ordem_compra: string;
  data_pedido: string;
  data_prevista: string;
  nome: string;
  valor: number;
  valor_frete: number;
  situacao: string;
  nome_transportador: string;
  endereco: string;
  numero_endereco: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
}

export interface ItemTinyDTO {
  item: {
    id_produto: string;
    codigo: string;
    descricao: string;
    unidade: string;
    quantidade: string;
    valor_unitario: string;
  };
}

export interface ClienteTinyDTO {
  nome: string;
  codigo: string;
  nome_fantasia: string | null;
  tipo_pessoa: string;
  cpf_cnpj: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  fone: string;
  email: string;
}

export interface PedidoDetalhadoTinyDTO {
  id: string;
  numero: string;
  numero_ecommerce: string | null;
  data_pedido: string;
  data_prevista: string;
  situacao: string;
  nome_transportador: string;
  valor_frete: string;
  total_pedido: string;
  cliente: ClienteTinyDTO;
  itens: ItemTinyDTO[];
}

export interface ItemPedidoDTO {
  sku: string;
  quantidade: number;
  descricao: string;
}

export interface PedidoSimulacaoDTO {
  id: string;
  numero: string;
  cliente: string;
  cpfCnpj: string;
  email: string;
  telefone: string;
  endereco: {
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
    enderecoCompleto: string;
  };
  valor: number;
  valorFrete: number;
  situacao: string;
  itens: ItemPedidoDTO[];
}

export function mapDetalhadoToPedidoSimulacao(
  detalhe: PedidoDetalhadoTinyDTO,
): PedidoSimulacaoDTO {
  const cliente = detalhe.cliente;

  const enderecoCompleto = [
    cliente.endereco,
    cliente.numero,
    cliente.complemento,
    cliente.bairro,
    `${cliente.cidade} - ${cliente.uf}`,
    cliente.cep,
  ]
    .filter(Boolean)
    .join(', ');

  const itens: ItemPedidoDTO[] = (detalhe.itens || []).map((i) => ({
    sku: i.item.codigo,
    quantidade: parseFloat(i.item.quantidade) || 0,
    descricao: i.item.descricao,
  }));

  return {
    id: detalhe.id,
    numero: detalhe.numero,
    cliente: cliente.nome,
    cpfCnpj: cliente.cpf_cnpj?.replace(/[.\-\/]/g, '') || '',
    email: cliente.email || '',
    telefone: cliente.fone || '',
    endereco: {
      logradouro: cliente.endereco,
      numero: cliente.numero,
      complemento: cliente.complemento || '',
      bairro: cliente.bairro,
      cidade: cliente.cidade,
      uf: cliente.uf,
      cep: cliente.cep?.replace(/[.\-]/g, '') || '',
      enderecoCompleto,
    },
    valor: parseFloat(detalhe.total_pedido) || 0,
    valorFrete: parseFloat(detalhe.valor_frete) || 0,
    situacao: detalhe.situacao,
    itens,
  };
}
