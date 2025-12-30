'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  listarEnviosMonitoramento,
  obterResumoMonitoramento,
  listarAlertas,
  atualizarTracking,
  EnvioMonitoramento,
  MonitoramentoResumo,
  AlertaEnvio,
} from '@/lib/api';

export default function MonitoramentoPage() {
  const [envios, setEnvios] = useState<EnvioMonitoramento[]>([]);
  const [resumo, setResumo] = useState<MonitoramentoResumo | null>(null);
  const [alertas, setAlertas] = useState<AlertaEnvio[]>([]);
  const [loading, setLoading] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [filtro, setFiltro] = useState<'todos' | 'transito' | 'alertas'>('todos');
  const [erro, setErro] = useState<string | null>(null);

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true);
      setErro(null);

      const [enviosRes, resumoRes, alertasRes] = await Promise.all([
        listarEnviosMonitoramento(),
        obterResumoMonitoramento(),
        listarAlertas(),
      ]);

      if (enviosRes.success && enviosRes.data) {
        setEnvios(enviosRes.data);
      }
      if (resumoRes.success && resumoRes.data) {
        setResumo(resumoRes.data);
      }
      if (alertasRes.success && alertasRes.data) {
        setAlertas(alertasRes.data);
      }
    } catch (err) {
      setErro('Erro ao carregar dados de monitoramento');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
    // Auto-refresh a cada 5 minutos
    const interval = setInterval(carregarDados, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [carregarDados]);

  const handleAtualizarTodos = async () => {
    try {
      setAtualizando(true);
      await atualizarTracking();
      await carregarDados();
    } catch (err) {
      setErro('Erro ao atualizar tracking');
    } finally {
      setAtualizando(false);
    }
  };

  const enviosFiltrados = envios.filter((e) => {
    if (filtro === 'transito') return e.ultimoStatus < 5;
    if (filtro === 'alertas') return e.alertaAtivo;
    return true;
  });

  const getStatusColor = (status: number, tempoParado: number) => {
    if (status >= 5) return 'bg-green-100 text-green-800'; // Finalizado
    if (tempoParado >= 48) return 'bg-red-100 text-red-800'; // Critico
    if (tempoParado >= 24) return 'bg-yellow-100 text-yellow-800'; // Alerta
    return 'bg-blue-100 text-blue-800'; // Normal
  };

  const formatarData = (dataStr: string) => {
    const data = new Date(dataStr);
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando monitoramento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Monitoramento de Entregas</h1>
            <p className="text-sm text-gray-500">FM Transportes - Setor da Embalagem</p>
          </div>
          <div className="flex gap-4">
            <Link
              href="/"
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              Voltar
            </Link>
            <button
              onClick={handleAtualizarTodos}
              disabled={atualizando}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {atualizando ? 'Atualizando...' : 'Atualizar Todos'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {erro && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {erro}
          </div>
        )}

        {/* Cards de Resumo */}
        {resumo && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-2xl font-bold text-gray-900">{resumo.total}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-500">Em Transito</p>
              <p className="text-2xl font-bold text-blue-600">{resumo.emTransito}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-500">Entregues</p>
              <p className="text-2xl font-bold text-green-600">{resumo.entregues}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-500">Parados +24h</p>
              <p className="text-2xl font-bold text-yellow-600">{resumo.parados24h}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-500">Parados +48h</p>
              <p className="text-2xl font-bold text-red-600">{resumo.parados48h}</p>
            </div>
          </div>
        )}

        {/* Alertas */}
        {alertas.length > 0 && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h2 className="text-lg font-semibold text-red-800 mb-2">
              Alertas ({alertas.length})
            </h2>
            <div className="space-y-2">
              {alertas.slice(0, 5).map((alerta) => (
                <div
                  key={alerta.id}
                  className="flex justify-between items-center p-2 bg-white rounded"
                >
                  <div>
                    <span className="font-medium">{alerta.pedidoNumero}</span>
                    <span className="mx-2 text-gray-400">|</span>
                    <span className="text-gray-600">{alerta.clienteNome}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 rounded text-sm ${
                        alerta.prioridade === 'alta'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {alerta.tempoParadoHoras}h parado
                    </span>
                    {alerta.clienteTelefone && (
                      <a
                        href={`https://wa.me/55${alerta.clienteTelefone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:text-green-800"
                        title="Contatar via WhatsApp"
                      >
                        WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setFiltro('todos')}
            className={`px-4 py-2 rounded ${
              filtro === 'todos'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Todos ({envios.length})
          </button>
          <button
            onClick={() => setFiltro('transito')}
            className={`px-4 py-2 rounded ${
              filtro === 'transito'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Em Transito ({envios.filter((e) => e.ultimoStatus < 5).length})
          </button>
          <button
            onClick={() => setFiltro('alertas')}
            className={`px-4 py-2 rounded ${
              filtro === 'alertas'
                ? 'bg-red-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Com Alerta ({envios.filter((e) => e.alertaAtivo).length})
          </button>
        </div>

        {/* Tabela de Envios */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Pedido
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Cliente
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Destino
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Ultima Mov.
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tempo Parado
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Acoes
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {enviosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Nenhum envio encontrado
                  </td>
                </tr>
              ) : (
                enviosFiltrados.map((envio) => (
                  <tr key={envio.id} className={envio.alertaAtivo ? 'bg-red-50' : ''}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{envio.pedidoNumero}</div>
                      <div className="text-xs text-gray-500">{envio.trackingCode}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-900">{envio.clienteNome}</div>
                      {envio.clienteTelefone && (
                        <div className="text-xs text-gray-500">{envio.clienteTelefone}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{envio.enderecoResumido}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                          envio.ultimoStatus,
                          envio.tempoParadoHoras
                        )}`}
                      >
                        {envio.ultimoStatusDescricao}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatarData(envio.ultimaMovimentacao)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-medium ${
                          envio.tempoParadoHoras >= 48
                            ? 'text-red-600'
                            : envio.tempoParadoHoras >= 24
                            ? 'text-yellow-600'
                            : 'text-gray-600'
                        }`}
                      >
                        {envio.tempoParadoHoras}h
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link
                          href={`/monitoramento/${envio.trackingCode}`}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Detalhes
                        </Link>
                        {envio.clienteTelefone && (
                          <a
                            href={`https://wa.me/55${envio.clienteTelefone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 hover:text-green-800 text-sm"
                          >
                            WhatsApp
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
