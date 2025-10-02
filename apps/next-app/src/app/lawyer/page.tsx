'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useNotifications } from '../../hooks/useNotifications';

interface Conversation {
  _id: string;
  roomId: string;
  status: string;
  classification: {
    category: string;
    complexity: string;
    legalArea: string;
  };
  summary: {
    text: string;
    lastUpdated: string;
  };
  assignedTo?: string;
  closedAt?: string;
  closedBy?: string;
  resolution?: string;
  transferHistory?: Array<{
    from: string;
    to: string;
    reason: string;
    transferredAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface LawyerStats {
  totalCases: number;
  openCases: number;
  closedCases: number;
  assignedCases: number;
  recentClosedCases: number;
  successRate: number;
}

export default function LawyerDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [cases, setCases] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, open, assigned, closed
  const [stats, setStats] = useState<LawyerStats | null>(null);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedCase, setSelectedCase] = useState<Conversation | null>(null);
  const [resolution, setResolution] = useState('');
  const [transferReason, setTransferReason] = useState('');

  const notifications = useNotifications();

  useEffect(() => {
    if (status === 'loading') return; // Still loading
    
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/lawyer');
      return;
    }

    if (session && !['lawyer', 'super_admin'].includes(session.user.role)) {
      router.push('/auth/signin?error=AccessDenied');
      return;
    }

    if (session) {
      loadCases();
      loadStats();
    }
  }, [session, status, router]);

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-2 text-slate-600">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  const loadCases = async () => {
    try {
      const response = await fetch('/api/lawyer/cases', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setCases(data);
    } catch (error) {
      console.error('Erro ao carregar casos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/lawyer/stats', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const closeCase = async (roomId: string, resolutionText: string) => {
    try {
      const response = await fetch(`/api/lawyer/cases/${roomId}/close`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution: resolutionText }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      loadCases(); // Recarregar lista
      loadStats(); // Recarregar estatísticas
      setShowCloseModal(false);
      setSelectedCase(null);
      setResolution('');
      notifications.success('Caso fechado!', 'O caso foi resolvido com sucesso.');
    } catch (error) {
      console.error('Erro ao fechar caso:', error);
      notifications.error('Erro ao fechar caso', 'Tente novamente.');
    }
  };



  const assignCase = async (roomId: string) => {
    try {
      const response = await fetch(`/api/lawyer/cases/${roomId}/assign`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      loadCases(); // Recarregar lista
      notifications.success('Caso atribuído!', 'Você agora é responsável por este caso.');
    } catch (error) {
      console.error('Erro ao atribuir caso:', error);
      notifications.error('Erro ao atribuir caso', 'Tente novamente.');
    }
  };

  const filteredCases = cases.filter(case_ => {
    if (filter === 'all') return true;
    if (filter === 'open') return case_.status === 'open';
    if (filter === 'assigned') return case_.assignedTo && case_.status !== 'closed';
    if (filter === 'closed') return case_.status === 'closed';
    return true;
  });

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'simples': return 'bg-green-100 text-green-800';
      case 'medio': return 'bg-yellow-100 text-yellow-800';
      case 'complexo': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'assigned': return 'bg-purple-100 text-purple-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Carregando casos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-slate-900 shadow-lg border-b border-slate-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2">
              <div className="text-2xl font-bold text-white">Juristec<span className="text-emerald-400">.com.br</span></div>
            </Link>
            <span className="text-slate-400">•</span>
            <span className="text-slate-400">Painel do Advogado</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-emerald-400 font-medium">Advogado</span>
            <Link
              href="/"
              className="text-slate-300 hover:text-white transition-colors text-sm font-medium"
            >
              ← Voltar ao Site
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800 mb-4">Meus Casos</h1>

          {/* Estatísticas */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-md p-4">
                <div className="text-2xl font-bold text-slate-800">{stats.totalCases}</div>
                <div className="text-sm text-slate-600">Total de Casos</div>
              </div>
              <div className="bg-blue-50 rounded-lg shadow-md p-4">
                <div className="text-2xl font-bold text-blue-600">{stats.openCases}</div>
                <div className="text-sm text-slate-600">Casos Abertos</div>
              </div>
              <div className="bg-purple-50 rounded-lg shadow-md p-4">
                <div className="text-2xl font-bold text-purple-600">{stats.assignedCases}</div>
                <div className="text-sm text-slate-600">Em Andamento</div>
              </div>
              <div className="bg-green-50 rounded-lg shadow-md p-4">
                <div className="text-2xl font-bold text-green-600">{stats.closedCases}</div>
                <div className="text-sm text-slate-600">Casos Fechados</div>
              </div>
              <div className="bg-emerald-50 rounded-lg shadow-md p-4">
                <div className="text-2xl font-bold text-emerald-600">{stats.recentClosedCases}</div>
                <div className="text-sm text-slate-600">Fechados (30d)</div>
              </div>
              <div className="bg-slate-50 rounded-lg shadow-md p-4">
                <div className="text-2xl font-bold text-slate-800">{stats.successRate}%</div>
                <div className="text-sm text-slate-600">Taxa de Sucesso</div>
              </div>
            </div>
          )}

          {/* Filtros */}
          <div className="flex space-x-2 mb-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'all'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              Todos ({cases.length})
            </button>
            <button
              onClick={() => setFilter('open')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'open'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              Abertos ({cases.filter(c => c.status === 'open').length})
            </button>
            <button
              onClick={() => setFilter('assigned')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'assigned'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              Em Andamento ({cases.filter(c => c.assignedTo && c.status !== 'closed').length})
            </button>
            <button
              onClick={() => setFilter('closed')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'closed'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              Fechados ({cases.filter(c => c.status === 'closed').length})
            </button>
          </div>
        </div>

        {/* Lista de Casos */}
        <div className="grid gap-4">
          {filteredCases.map((case_) => (
            <div key={case_.roomId} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-semibold text-slate-800">
                      Caso #{case_.roomId.slice(-6)}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(case_.status)}`}>
                      {case_.status === 'open' ? 'Aberto' :
                       case_.status === 'assigned' ? 'Atribuído' : 'Fechado'}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getComplexityColor(case_.classification.complexity)}`}>
                      {case_.classification.complexity === 'simples' ? 'Simples' :
                       case_.classification.complexity === 'medio' ? 'Médio' : 'Complexo'}
                    </span>
                  </div>

                  <div className="text-sm text-slate-600 mb-2">
                    <strong>Categoria:</strong> {case_.classification.category} •
                    <strong> Área:</strong> {case_.classification.legalArea}
                  </div>

                  <p className="text-slate-700 mb-3">{case_.summary.text}</p>

                  <div className="text-xs text-slate-500">
                    Criado em: {new Date(case_.createdAt).toLocaleDateString('pt-BR')} •
                    Atualizado: {new Date(case_.updatedAt).toLocaleDateString('pt-BR')}
                  </div>
                </div>

                <div className="ml-4">
                  {case_.status === 'open' && !case_.assignedTo ? (
                    <button
                      onClick={() => assignCase(case_.roomId)}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                    >
                      Pegar Caso
                    </button>
                  ) : case_.assignedTo && case_.status !== 'closed' ? (
                    <div className="flex flex-col space-y-2">
                      <div className="text-emerald-600 font-medium text-sm text-center mb-2">
                        Caso atribuído a você
                      </div>
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                        <a href={`/lawyer/chat/${case_.roomId}`} className="text-white no-underline">Ver Chat Completo</a>
                      </button>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedCase(case_);
                            setShowCloseModal(true);
                          }}
                          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-xs font-medium"
                        >
                          Fechar Caso
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCase(case_);
                            setShowTransferModal(true);
                          }}
                          className="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors text-xs font-medium"
                        >
                          Transferir
                        </button>
                      </div>
                    </div>
                  ) : case_.status === 'closed' ? (
                    <div className="text-center">
                      <div className="text-green-600 font-medium text-sm mb-2">
                        Caso Fechado
                      </div>
                      <div className="text-xs text-slate-500">
                        {case_.closedAt ? new Date(case_.closedAt).toLocaleDateString('pt-BR') : 'Data não disponível'}
                      </div>
                      {case_.resolution && (
                        <div className="text-xs text-slate-600 mt-1 max-w-32 truncate" title={case_.resolution}>
                          {case_.resolution}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredCases.length === 0 && (
          <div className="text-center py-12">
            <div className="text-slate-400 text-lg">Nenhum caso encontrado</div>
            <div className="text-slate-500 text-sm mt-2">
              {filter === 'open' ? 'Não há casos abertos no momento.' :
               filter === 'assigned' ? 'Você não tem casos em andamento.' :
               filter === 'closed' ? 'Você não tem casos fechados.' :
               'Nenhum caso disponível.'}
            </div>
          </div>
        )}
      </div>

      {/* Modal Fechar Caso */}
      {showCloseModal && selectedCase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Fechar Caso</h3>
            <p className="text-slate-600 mb-4">
              Você está prestes a fechar o caso <strong>#{selectedCase.roomId.slice(-6)}</strong>.
              Esta ação não pode ser desfeita.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Resolução do Caso
              </label>
              <textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                rows={4}
                placeholder="Descreva como o caso foi resolvido..."
                required
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowCloseModal(false);
                  setSelectedCase(null);
                  setResolution('');
                }}
                className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => closeCase(selectedCase.roomId, resolution)}
                disabled={!resolution.trim()}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Fechar Caso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Transferir Caso */}
      {showTransferModal && selectedCase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Transferir Caso</h3>
            <p className="text-slate-600 mb-4">
              Transferir o caso <strong>#{selectedCase.roomId.slice(-6)}</strong> para outro advogado.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Motivo da Transferência
              </label>
              <textarea
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                rows={3}
                placeholder="Explique o motivo da transferência..."
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Advogado Destino
              </label>
              <select className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                <option value="">Selecione um advogado...</option>
                {/* TODO: Carregar lista de advogados disponíveis */}
                <option value="lawyer1">Advogado Silva</option>
                <option value="lawyer2">Advogada Santos</option>
              </select>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  setSelectedCase(null);
                  setTransferReason('');
                }}
                className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  // TODO: Implementar transferência
                  notifications.info('Em breve!', 'Funcionalidade de transferência será implementada em breve.');
                  setShowTransferModal(false);
                  setSelectedCase(null);
                  setTransferReason('');
                }}
                disabled={!transferReason.trim()}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Transferir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}