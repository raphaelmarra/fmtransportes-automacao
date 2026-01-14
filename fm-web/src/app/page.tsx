'use client';

import { useState, useEffect } from 'react';
import { Pedido, EnvioResultado, EtiquetaResultado, buscarPedidosFMTransportes, enviarPedidos, gerarEtiquetas, gerarDeclaracao, montarDadosDeclaracao } from '@/lib/api';
import { formatarMoeda } from '@/lib/utils';
import { abrirEtiqueta10x15, combinarEtiquetas10x15 } from '@/lib/pdf-utils';

export default function Home() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [resultados, setResultados] = useState<EnvioResultado[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [gerandoEtiquetas, setGerandoEtiquetas] = useState(false);
  const [etiquetas, setEtiquetas] = useState<EtiquetaResultado[]>([]);
  const [processandoPdf, setProcessandoPdf] = useState(false);
  const [dataSelecionada, setDataSelecionada] = useState<string>('');
  const [gerandoDeclaracoes, setGerandoDeclaracoes] = useState(false);
  const [declaracoes, setDeclaracoes] = useState<Array<{ trackingCode: string; pedidoNumero: string; pdfUrl: string | null; erro?: string }>>([]);
  const [volumesPorPedido, setVolumesPorPedido] = useState<Map<string, number | undefined>>(new Map());

  useEffect(() => {
    // Define data de hoje no formato YYYY-MM-DD
    const hoje = new Date();
    const dataFormatada = hoje.toISOString().split('T')[0];
    setDataSelecionada(dataFormatada);
  }, []);

  useEffect(() => {
    if (dataSelecionada) {
      carregarPedidos();
    }
  }, [dataSelecionada]);

  async function carregarPedidos() {
    setCarregando(true);
    setErro(null);
    try {
      // Converte YYYY-MM-DD para DD/MM/YYYY para a API
      const dataApi = dataSelecionada
        ? dataSelecionada.split('-').reverse().join('/')
        : undefined;
      const response = await buscarPedidosFMTransportes(dataApi);
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
      const dataApi = dataSelecionada ? dataSelecionada.split('-').reverse().join('/') : undefined;
      const response = await enviarPedidos(Array.from(selecionados), dataApi);
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

  // Pega tracking codes dos resultados que foram enviados com sucesso
  const trackingCodesEnviados = resultados
    .filter(r => r.sucesso && r.trackingCode)
    .map(r => r.trackingCode as string);

  async function handleGerarEtiquetas() {
    if (trackingCodesEnviados.length === 0) {
      alert('Nenhum pedido enviado com tracking code disponivel');
      return;
    }

    setGerandoEtiquetas(true);
    setEtiquetas([]);

    try {
      const response = await gerarEtiquetas(trackingCodesEnviados);
      setEtiquetas(response.etiquetas || []);

      if (response.success) {
        const sucessos = response.resumo?.sucessos || 0;
        alert(`${sucessos} etiqueta(s) gerada(s) com sucesso!`);
      } else {
        alert('Erro ao gerar etiquetas');
      }
    } catch (e: any) {
      alert(e.message || 'Erro de conexao');
    } finally {
      setGerandoEtiquetas(false);
    }
  }

  async function handleGerarDeclaracoes() {
    const pedidosEnviados = resultados
      .filter(r => r.sucesso && r.trackingCode)
      .map(r => {
        const pedido = pedidos.find(p => p.id === r.pedidoId);
        return { resultado: r, pedido };
      })
      .filter(item => item.pedido);

    if (pedidosEnviados.length === 0) {
      alert('Nenhum pedido enviado com tracking code disponivel');
      return;
    }

    // Verificar se todos os volumes estao preenchidos
    const pedidosSemVolume = pedidosEnviados.filter(({ resultado }) => {
      const vol = volumesPorPedido.get(resultado.pedidoId);
      return vol === undefined || vol === null || vol <= 0;
    });

    if (pedidosSemVolume.length > 0) {
      const numeros = pedidosSemVolume.map(p => p.resultado.pedidoNumero).join(', ');
      alert(`Preencha o campo VOLUMES para os pedidos: ${numeros}`);
      return;
    }

    setGerandoDeclaracoes(true);
    setDeclaracoes([]);

    const novasDeclaracoes: Array<{ trackingCode: string; pedidoNumero: string; pdfUrl: string | null; erro?: string }> = [];

    for (const { resultado, pedido } of pedidosEnviados) {
      try {
        const volumes = volumesPorPedido.get(resultado.pedidoId);
        const dados = montarDadosDeclaracao(pedido!, resultado.trackingCode!, volumes);
        const response = await gerarDeclaracao(dados);

        if (response.success && response.pdf) {
          // Converte base64 para blob URL
          const byteCharacters = atob(response.pdf);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'application/pdf' });
          const pdfUrl = URL.createObjectURL(blob);

          novasDeclaracoes.push({
            trackingCode: resultado.trackingCode!,
            pedidoNumero: resultado.pedidoNumero,
            pdfUrl,
          });
        } else {
          novasDeclaracoes.push({
            trackingCode: resultado.trackingCode!,
            pedidoNumero: resultado.pedidoNumero,
            pdfUrl: null,
            erro: response.error || 'Erro ao gerar declaracao',
          });
        }
      } catch (e: any) {
        novasDeclaracoes.push({
          trackingCode: resultado.trackingCode!,
          pedidoNumero: resultado.pedidoNumero,
          pdfUrl: null,
          erro: e.message || 'Erro de conexao',
        });
      }
    }

    setDeclaracoes(novasDeclaracoes);
    setGerandoDeclaracoes(false);

    const sucessos = novasDeclaracoes.filter(d => d.pdfUrl).length;
    alert(`${sucessos} declaracao(es) gerada(s) com sucesso!`);
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
              <div className="flex items-center gap-2">
                <label htmlFor="data" className="text-sm text-gray-600">Data:</label>
                <input
                  type="date"
                  id="data"
                  value={dataSelecionada}
                  onChange={(e) => setDataSelecionada(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
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
            <div className="flex gap-3">
              <button
                onClick={handleEnviar}
                disabled={enviando || selecionados.size === 0}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {enviando ? 'Enviando...' : `Enviar para FM (${selecionados.size})`}
              </button>
              {trackingCodesEnviados.length > 0 && (
                <>
                  <button
                    onClick={handleGerarEtiquetas}
                    disabled={gerandoEtiquetas}
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {gerandoEtiquetas ? 'Gerando...' : `Gerar Etiquetas (${trackingCodesEnviados.length})`}
                  </button>
                  <button
                    onClick={handleGerarDeclaracoes}
                    disabled={gerandoDeclaracoes}
                    className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {gerandoDeclaracoes ? 'Gerando...' : `Gerar Declaracoes (${trackingCodesEnviados.length})`}
                  </button>
                </>
              )}
            </div>
          </div>

          {erro && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
              {erro}
            </div>
          )}

          {resultados.length > 0 && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
              <h3 className="font-semibold text-green-800 mb-2">Resultados do Envio</h3>
              <div className="space-y-2 text-sm">
                {resultados.map((r, i) => (
                  <div key={i} className={`flex items-center gap-4 ${r.sucesso ? 'text-green-700' : 'text-red-600'}`}>
                    <span className="flex-1">
                      Pedido {r.pedidoNumero}: {r.sucesso ? `Tracking: ${r.trackingCode}` : `Erro: ${r.erro}`}
                    </span>
                    {r.sucesso && (
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-gray-600">Volumes:</label>
                        <input
                          type="number"
                          min="1"
                          placeholder="?"
                          value={volumesPorPedido.get(r.pedidoId) ?? ''}
                          onChange={(e) => {
                            const valor = e.target.value ? parseInt(e.target.value, 10) : undefined;
                            setVolumesPorPedido(prev => {
                              const novo = new Map(prev);
                              novo.set(r.pedidoId, valor);
                              return novo;
                            });
                          }}
                          className="w-16 px-2 py-1 text-center border border-gray-300 rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {resultados.some(r => r.sucesso) && (
                <p className="mt-3 text-xs text-gray-500 border-t border-green-200 pt-2">
                  Preencha o campo VOLUMES antes de gerar as declaracoes
                </p>
              )}
            </div>
          )}

          {etiquetas.length > 0 && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h3 className="font-semibold text-blue-800 mb-2">Etiquetas Geradas</h3>
              <div className="space-y-2 text-sm">
                {etiquetas.map((e, i) => (
                  <div key={i} className={`flex items-center justify-between ${e.sucesso ? 'text-blue-700' : 'text-red-600'}`}>
                    <span>Tracking: {e.trackingCode}</span>
                    {e.sucesso && e.labelUrl ? (
                      <div className="flex gap-2">
                        <a
                          href={e.labelUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-xs"
                        >
                          Original
                        </a>
                        <button
                          onClick={() => abrirEtiqueta10x15(e.labelUrl!)}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                        >
                          10x15cm
                        </button>
                      </div>
                    ) : (
                      <span className="text-red-500 text-xs">{e.erro || 'Erro ao gerar'}</span>
                    )}
                  </div>
                ))}
              </div>
              {etiquetas.some(e => e.sucesso && e.labelUrl) && (
                <div className="mt-3 pt-3 border-t border-blue-200 flex gap-3 flex-wrap">
                  <button
                    onClick={() => {
                      etiquetas
                        .filter(e => e.sucesso && e.labelUrl)
                        .forEach(e => window.open(e.labelUrl!, '_blank'));
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                  >
                    Abrir Originais
                  </button>
                  <button
                    onClick={async () => {
                      setProcessandoPdf(true);
                      try {
                        const urls = etiquetas
                          .filter(e => e.sucesso && e.labelUrl)
                          .map(e => e.labelUrl!);
                        const blob = await combinarEtiquetas10x15(urls);
                        const url = URL.createObjectURL(blob);
                        window.open(url, '_blank');
                      } catch (err) {
                        alert('Erro ao processar PDFs');
                      } finally {
                        setProcessandoPdf(false);
                      }
                    }}
                    disabled={processandoPdf}
                    className="px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 text-sm disabled:opacity-50"
                  >
                    {processandoPdf ? 'Processando...' : 'Abrir Todas 10x15cm'}
                  </button>
                </div>
              )}
            </div>
          )}

          {declaracoes.length > 0 && (
            <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-md">
              <h3 className="font-semibold text-purple-800 mb-2">Declaracoes de Conteudo</h3>
              <div className="space-y-2 text-sm">
                {declaracoes.map((d, i) => (
                  <div key={i} className={`flex items-center justify-between ${d.pdfUrl ? 'text-purple-700' : 'text-red-600'}`}>
                    <span>Pedido {d.pedidoNumero} - Tracking: {d.trackingCode}</span>
                    {d.pdfUrl ? (
                      <button
                        onClick={() => window.open(d.pdfUrl!, '_blank')}
                        className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-xs"
                      >
                        Abrir Declaracao
                      </button>
                    ) : (
                      <span className="text-red-500 text-xs">{d.erro || 'Erro ao gerar'}</span>
                    )}
                  </div>
                ))}
              </div>
              {declaracoes.some(d => d.pdfUrl) && (
                <div className="mt-3 pt-3 border-t border-purple-200">
                  <button
                    onClick={() => {
                      declaracoes
                        .filter(d => d.pdfUrl)
                        .forEach(d => window.open(d.pdfUrl!, '_blank'));
                    }}
                    className="px-4 py-2 bg-purple-700 text-white rounded hover:bg-purple-800 text-sm"
                  >
                    Abrir Todas Declaracoes
                  </button>
                </div>
              )}
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
          FM Transportes - Setor da Embalagem | MVP 3 - Envio + Etiquetas + Declaracoes
        </footer>
      </div>
    </main>
  );
}
