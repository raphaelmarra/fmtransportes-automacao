'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  buscarEnvioDetalhe,
  atualizarTracking,
  EnvioMonitoramento,
  TrackingEvento,
} from '@/lib/api';

export default function DetalhesEnvioPage() {
  const params = useParams();
  const router = useRouter();
  const trackingCode = params.trackingCode as string;

  const [envio, setEnvio] = useState<EnvioMonitoramento | null>(null);
  const [eventos, setEventos] = useState<TrackingEvento[]>([]);
  const [loading, setLoading] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true);
      setErro(null);

      const response = await buscarEnvioDetalhe(trackingCode);

      if (response.success && response.data) {
        setEnvio(response.data.envio);
        setEventos(response.data.eventos);
      } else {
        setErro(response.error || 'Envio nao encontrado');
      }
    } catch (err) {
      setErro('Erro ao carregar detalhes do envio');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [trackingCode]);

  useEffect(() => {
    if (trackingCode) {
      carregarDados();
    }
  }, [trackingCode, carregarDados]);

  const handleAtualizar = async () => {
    try {
      setAtualizando(true);
      await atualizarTracking(trackingCode);
      await carregarDados();
    } catch (err) {
      setErro('Erro ao atualizar tracking');
    } finally {
      setAtualizando(false);
    }
  };

  const formatarData = (dataStr: string) => {
    const data = new Date(dataStr);
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: number) => {
    if (status >= 5) return 'bg-green-500';
    if (status >= 3) return 'bg-blue-500';
    if (status >= 1) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando detalhes...</p>
        </div>
      </div>
    );
  }

  if (erro || !envio) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg">{erro || 'Envio nao encontrado'}</p>
          <button
            onClick={() => router.push('/monitoramento')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Voltar ao Monitoramento
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Pedido {envio.pedidoNumero}
            </h1>
            <p className="text-sm text-gray-500">Tracking: {envio.trackingCode}</p>
          </div>
          <div className="flex gap-4">
            <Link
              href="/monitoramento"
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              Voltar
            </Link>
            <button
              onClick={handleAtualizar}
              disabled={atualizando}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {atualizando ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Info do Envio */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-semibold mb-4">Informacoes do Cliente</h2>
              <dl className="space-y-2">
                <div>
                  <dt className="text-sm text-gray-500">Nome</dt>
                  <dd className="font-medium">{envio.clienteNome}</dd>
                </div>
                {envio.clienteTelefone && (
                  <div>
                    <dt className="text-sm text-gray-500">Telefone</dt>
                    <dd className="font-medium">
                      {envio.clienteTelefone}
                      <a
                        href={`https://wa.me/55${envio.clienteTelefone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-green-600 hover:text-green-800"
                      >
                        WhatsApp
                      </a>
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm text-gray-500">Destino</dt>
                  <dd className="font-medium">{envio.enderecoResumido}</dd>
                </div>
              </dl>
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-4">Status do Envio</h2>
              <dl className="space-y-2">
                <div>
                  <dt className="text-sm text-gray-500">Status Atual</dt>
                  <dd>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-white ${getStatusColor(
                        envio.ultimoStatus
                      )}`}
                    >
                      {envio.ultimoStatusDescricao}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Data do Envio</dt>
                  <dd className="font-medium">{formatarData(envio.dataEnvio)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Ultima Movimentacao</dt>
                  <dd className="font-medium">{formatarData(envio.ultimaMovimentacao)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Tempo Parado</dt>
                  <dd
                    className={`font-medium ${
                      envio.tempoParadoHoras >= 48
                        ? 'text-red-600'
                        : envio.tempoParadoHoras >= 24
                        ? 'text-yellow-600'
                        : 'text-gray-900'
                    }`}
                  >
                    {envio.tempoParadoHoras} horas
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {envio.alertaAtivo && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded">
              <p className="text-red-800 font-medium">
                Alerta: Este envio esta parado ha mais de {envio.tempoParadoHoras} horas
              </p>
            </div>
          )}
        </div>

        {/* Timeline de Eventos */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Historico de Eventos</h2>

          {eventos.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Nenhum evento registrado ainda
            </p>
          ) : (
            <div className="relative">
              {/* Linha vertical */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>

              <div className="space-y-6">
                {eventos.map((evento, index) => (
                  <div key={evento.trackingId || index} className="relative pl-10">
                    {/* Bolinha */}
                    <div
                      className={`absolute left-2 w-5 h-5 rounded-full border-2 border-white ${getStatusColor(
                        evento.status
                      )}`}
                    ></div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">
                            {evento.statusDescricao}
                          </p>
                          {evento.receivedBy && (
                            <p className="text-sm text-gray-600">
                              Recebido por: {evento.receivedBy}
                            </p>
                          )}
                        </div>
                        <span className="text-sm text-gray-500">
                          {formatarData(evento.dataEvento)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
