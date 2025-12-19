'use client';

import { useState, useEffect } from 'react';
import { Pedido, EnvioResultado, buscarPedidosFMTransportes, enviarPedidos } from '@/lib/api';
import { formatarMoeda } from '@/lib/utils';

export default function Home() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [resultados, setResultados] = useState<EnvioResultado[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    carregarPedidos();
  }, []);

  async function carregarPedidos() {
    setCarregando(true);
    setErro(null);
    try {
      const response = await buscarPedidosFMTransportes();
      if (response.success && response.data) {
        setPedidos(response.data);
      } else {
        setErro(response.error || 'Erro ao carregar pedidos');
      }
    } catch (e: any) {
      setErro(e.message || 'Erro de conexao');
    } finally {
      setCarregando(false);
    }
  }

  function toggleSelecao(id: string) {
    const novoSet = new Set(selecionados);
    if (novoSet.has(id)) {
      novoSet.delete(id);
    } else {
      novoSet.add(id);
    }
    setSelecionados(novoSet);
  }

  function toggleTodos() {
    if (selecionados.size === pedidos.length) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(pedidos.map(p => p.id)));
    }
  }

  async function handleEnviar() {
    if (selecionados.size === 0) {
      alert('Selecione pelo menos um pedido');
      return;
    }

    setEnviando(true);
    setResultados([]);

    try {
      const response = await enviarPedidos(Array.from(selecionados));
      setResultados(response.resultados || []);

      if (response.success) {
        alert(`${response.resumo?.sucessos || 0} pedidos enviados com sucesso!`);
        // Limpa selecao dos que foram enviados com sucesso
        const enviados = new Set(
          response.resultados
            .filter(r => r.sucesso)
            .map(r => r.pedidoId)
        );
        setSelecionados(prev => {
          const novo = new Set(prev);
          enviados.forEach(id => novo.delete(id));
          return novo;
        });
      } else {
        alert(response.error || 'Erro ao enviar pedidos');
      }
    } catch (e: any) {
      alert(e.message || 'Erro de conexao');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">FM Transportes</h1>
          <p className="text-gray-600 mt-2">Selecione os pedidos para enviar ao sistema FM Transportes</p>
        </header>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={carregarPedidos}
                disabled={carregando}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 disabled:opacity-50"
              >
                {carregando ? 'Carregando...' : 'Atualizar'}
              </button>
              <span className="text-gray-500">
                {pedidos.length} pedidos encontrados | {selecionados.size} selecionados
              </span>
            </div>
            <button
              onClick={handleEnviar}
              disabled={enviando || selecionados.size === 0}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {enviando ? 'Enviando...' : `Enviar para FM (${selecionados.size})`}
            </button>
          </div>

          {erro && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
              {erro}
            </div>
          )}

          {resultados.length > 0 && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
              <h3 className="font-semibold text-green-800 mb-2">Resultados do Envio</h3>
              <div className="space-y-1 text-sm">
                {resultados.map((r, i) => (
                  <div key={i} className={r.sucesso ? 'text-green-700' : 'text-red-600'}>
                    Pedido {r.pedidoNumero}: {r.sucesso ? `Tracking: ${r.trackingCode}` : `Erro: ${r.erro}`}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b">
                  <th className="p-3 text-left">
                    <input
                      type="checkbox"
                      checked={selecionados.size === pedidos.length && pedidos.length > 0}
                      onChange={toggleTodos}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                  </th>
                  <th className="p-3 text-left font-semibold text-gray-700">Pedido</th>
                  <th className="p-3 text-left font-semibold text-gray-700">Cliente</th>
                  <th className="p-3 text-left font-semibold text-gray-700">Cidade/UF</th>
                  <th className="p-3 text-left font-semibold text-gray-700">CEP</th>
                  <th className="p-3 text-right font-semibold text-gray-700">Valor</th>
                  <th className="p-3 text-left font-semibold text-gray-700">Situacao</th>
                </tr>
              </thead>
              <tbody>
                {carregando ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500">
                      Carregando pedidos...
                    </td>
                  </tr>
                ) : pedidos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500">
                      Nenhum pedido FM Transportes encontrado para hoje
                    </td>
                  </tr>
                ) : (
                  pedidos.map((pedido) => {
                    const resultado = resultados.find(r => r.pedidoId === pedido.id);
                    return (
                      <tr
                        key={pedido.id}
                        className={`border-b hover:bg-gray-50 ${
                          resultado?.sucesso ? 'bg-green-50' : ''
                        } ${resultado && !resultado.sucesso ? 'bg-red-50' : ''}`}
                      >
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selecionados.has(pedido.id)}
                            onChange={() => toggleSelecao(pedido.id)}
                            disabled={resultado?.sucesso}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                        </td>
                        <td className="p-3 font-medium text-gray-900">
                          #{pedido.numero}
                          {resultado?.trackingCode && (
                            <div className="text-xs text-green-600 mt-1">
                              {resultado.trackingCode}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-gray-700">
                          <div>{pedido.cliente}</div>
                          <div className="text-xs text-gray-500">{pedido.cpfCnpj}</div>
                        </td>
                        <td className="p-3 text-gray-700">
                          {pedido.endereco.cidade}/{pedido.endereco.uf}
                        </td>
                        <td className="p-3 text-gray-700">{pedido.endereco.cep}</td>
                        <td className="p-3 text-right text-gray-900 font-medium">
                          {formatarMoeda(pedido.valor)}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                            {pedido.situacao}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <footer className="mt-8 text-center text-gray-500 text-sm">
          FM Transportes - Setor da Embalagem | MVP 1 - Envio de Pedidos
        </footer>
      </div>
    </main>
  );
}
