'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useNotifications } from '../../hooks/useNotifications';

type CaseStatus =
  | 'open'
  | 'active'
  | 'resolved_by_ai'
  | 'assigned'
  | 'completed'
  | 'abandoned';

type CasePriority = 'low' | 'medium' | 'high' | 'urgent';

type FilterOption = 'all' | 'open' | 'assigned' | 'closed';

interface Conversation {
  _id?: string;
  id?: string;
  roomId: string;
  status: CaseStatus;
  classification?: {
    category?: string;
    complexity?: string;
    legalArea?: string;
  };
  summary?: {
    text?: string;
    lastUpdated?: string;
    generatedBy?: string;
  };
  priority?: CasePriority;
  lawyerNeeded?: boolean;
  assignedTo?: string | null;
  assignedAt?: string | null;
  closedAt?: string | null;
  closedBy?: string | null;
  resolution?: string | null;
  transferHistory?: Array<{
    from: string;
    to: string;
    reason: string;
    transferredAt: string;
  }>;
  clientInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
}

interface LawyerStats {
  totalCases: number;
  openCases: number;
  closedCases: number;
  assignedCases: number;
  availableCases: number;
  recentClosedCases: number;
  successRate: number;
}

export default function LawyerDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [cases, setCases] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterOption>('all');
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
      
      // Debug: mostrar status de todos os casos
      console.log('Casos carregados:', data.map((c: Conversation) => ({ 
        roomId: c.roomId, 
        status: c.status,
        assignedTo: c.assignedTo,
        lawyerNeeded: c.lawyerNeeded
      })));
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
        
        // Debug: mostrar estatísticas
        console.log('Estatísticas carregadas:', data);
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

  const matchesFilter = (case_: Conversation, currentFilter: FilterOption) => {
    if (currentFilter === 'all') {
      return true;
    }

    const status = case_.status;
    const isClosedStatus =
      status === 'completed' || status === 'abandoned' || status === 'resolved_by_ai';
    const hasAssignedLawyer = Boolean(case_.assignedTo) && !isClosedStatus;
    const awaitingLawyer =
      case_.lawyerNeeded === true && !hasAssignedLawyer && !isClosedStatus;
    const inAICare = !hasAssignedLawyer && !awaitingLawyer && !isClosedStatus;

    // Debug: mostrar status dos casos
    if (currentFilter === 'closed' && isClosedStatus) {
      console.log('Caso fechado encontrado:', case_.roomId, 'Status:', status);
    }

    switch (currentFilter) {
      case 'open':
        return awaitingLawyer || inAICare;
      case 'assigned':
        return hasAssignedLawyer;
      case 'closed':
        return isClosedStatus;
      default:
        return true;
    }
  };

  const filteredCases = useMemo(
    () => cases.filter((case_) => matchesFilter(case_, filter)),
    [cases, filter]
  );

  const formatDate = (value?: string | null) => {
    if (!value) {
      return 'Data não disponível';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'Data não disponível';
    }

    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getComplexityColor = (complexity?: string) => {
    switch (complexity) {
      case 'simples':
        return 'bg-emerald-100 text-emerald-700';
      case 'medio':
        return 'bg-amber-100 text-amber-700';
      case 'complexo':
        return 'bg-rose-100 text-rose-700';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  const getComplexityLabel = (complexity?: string) => {
    switch (complexity) {
      case 'simples':
        return 'Simples';
      case 'medio':
        return 'Médio';
      case 'complexo':
        return 'Complexo';
      default:
        return 'Complexidade não informada';
    }
  };

  const getPriorityPresentation = (priority?: CasePriority) => {
    switch (priority) {
      case 'urgent':
        return { label: 'Urgente', color: 'bg-red-100 text-red-700' };
      case 'high':
        return { label: 'Alta', color: 'bg-orange-100 text-orange-700' };
      case 'medium':
        return { label: 'Média', color: 'bg-amber-100 text-amber-700' };
      case 'low':
        return { label: 'Baixa', color: 'bg-slate-100 text-slate-600' };
      default:
        return { label: 'Normal', color: 'bg-slate-100 text-slate-600' };
    }
  };

  const getStatusPresentation = (case_: Conversation) => {
    const hasAssignedLawyer = Boolean(case_.assignedTo);
    const awaitingLawyer = case_.lawyerNeeded === true && !hasAssignedLawyer;

    switch (case_.status) {
      case 'open':
        if (awaitingLawyer) {
          return { label: 'Aguardando advogado', color: 'bg-blue-100 text-blue-700' };
        }
        return { label: 'Em análise pela IA', color: 'bg-emerald-100 text-emerald-700' };
      case 'active':
        if (awaitingLawyer) {
          return { label: 'Aguardando advogado', color: 'bg-blue-100 text-blue-700' };
        }
        return { label: 'Em andamento', color: 'bg-emerald-100 text-emerald-700' };
      case 'resolved_by_ai':
        return { label: 'Resolvido pela IA', color: 'bg-emerald-100 text-emerald-700' };
      case 'assigned':
        if (awaitingLawyer) {
          return { label: 'Aguardando advogado', color: 'bg-blue-100 text-blue-700' };
        }
        if (hasAssignedLawyer) {
          return { label: 'Com advogado', color: 'bg-purple-100 text-purple-700' };
        }
        return { label: 'Em triagem jurídica', color: 'bg-emerald-100 text-emerald-700' };
      case 'completed':
        return { label: 'Concluído', color: 'bg-slate-200 text-slate-700' };
      case 'abandoned':
        return { label: 'Abandonado', color: 'bg-orange-100 text-orange-700' };
      default:
        return { label: 'Status desconhecido', color: 'bg-slate-100 text-slate-600' };
    }
  };

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
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-md p-4">
                <div className="text-2xl font-bold text-slate-800">{stats.totalCases}</div>
                <div className="text-sm text-slate-600">Total de Casos</div>
              </div>
              <div className="bg-orange-50 rounded-lg shadow-md p-4">
                <div className="text-2xl font-bold text-orange-600">{stats.availableCases}</div>
                <div className="text-sm text-slate-600">Disponíveis</div>
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
              Abertos ({cases.filter((c) => matchesFilter(c, 'open')).length})
            </button>
            <button
              onClick={() => setFilter('assigned')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'assigned'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              Em Andamento ({cases.filter((c) => matchesFilter(c, 'assigned')).length})
            </button>
            <button
              onClick={() => setFilter('closed')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'closed'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              Fechados ({cases.filter((c) => matchesFilter(c, 'closed')).length})
            </button>
          </div>
        </div>

        {/* Lista de Casos */}
        <div className="grid gap-4">
          {filteredCases.map((case_) => {
            const statusInfo = getStatusPresentation(case_);
            const complexityValue = case_.classification?.complexity;
            const complexityColor = getComplexityColor(complexityValue);
            const complexityLabel = getComplexityLabel(complexityValue);
            const category = case_.classification?.category ?? 'Categoria não informada';
            const legalArea = case_.classification?.legalArea ?? 'Área não informada';
            const summaryText =
              case_.summary?.text?.trim() ||
              'Resumo ainda não gerado pela IA. Aguarde enquanto coletamos mais informações.';
            const createdAt = formatDate(case_.createdAt);
            const updatedAt = formatDate(case_.lastMessageAt || case_.updatedAt);
            const priorityInfo = getPriorityPresentation(case_.priority);

            const sessionUser = session?.user as { id?: string; _id?: string } | undefined;
            const assignedToCurrentLawyer =
              Boolean(case_.assignedTo) &&
              (case_.assignedTo === sessionUser?.id || case_.assignedTo === sessionUser?._id);

            const isAssigned = Boolean(case_.assignedTo);
            const isAssignedToAnother = isAssigned && !assignedToCurrentLawyer;
            const isClosed =
              case_.status === 'completed' ||
              case_.status === 'abandoned' ||
              case_.status === 'resolved_by_ai';
            const canAssign = !isAssigned && !isClosed && case_.lawyerNeeded === true;

            return (
              <div key={case_.roomId} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-slate-800">
                        Caso #{case_.roomId.slice(-6)}
                      </h3>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}
                      >
                        {statusInfo.label}
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${complexityColor}`}
                      >
                        {complexityLabel}
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${priorityInfo.color}`}
                      >
                        Prioridade: {priorityInfo.label}
                      </span>
                    </div>

                    <div className="text-sm text-slate-600 mb-2 flex flex-wrap gap-2">
                      <span>
                        <strong>Categoria:</strong> {category}
                      </span>
                      <span>•</span>
                      <span>
                        <strong>Área:</strong> {legalArea}
                      </span>
                    </div>

                    <p className="text-slate-700 mb-3 leading-relaxed">{summaryText}</p>

                    <div className="text-xs text-slate-500 flex flex-wrap gap-2">
                      <span>Criado em: {createdAt}</span>
                      <span>•</span>
                      <span>Última atividade: {updatedAt}</span>
                    </div>
                  </div>

                  <div className="w-full md:w-auto md:ml-4 flex flex-col items-stretch text-sm space-y-2">
                    {canAssign ? (
                      <button
                        onClick={() => assignCase(case_.roomId)}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                      >
                        Assumir Caso
                      </button>
                    ) : assignedToCurrentLawyer && !isClosed ? (
                      <>
                        <div className="text-emerald-600 font-medium text-center md:text-left">
                          Caso sob sua responsabilidade
                        </div>
                        <Link
                          href={`/lawyer/chat/${case_.roomId}`}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-center hover:bg-blue-700 transition-colors font-medium"
                        >
                          Abrir Chat
                        </Link>
                        <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
                          <button
                            onClick={() => {
                              setSelectedCase(case_);
                              setShowCloseModal(true);
                            }}
                            className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium"
                          >
                            Fechar Caso
                          </button>
                          <button
                            onClick={() => {
                              setSelectedCase(case_);
                              setShowTransferModal(true);
                            }}
                            className="flex-1 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-xs font-medium"
                          >
                            Transferir
                          </button>
                        </div>
                      </>
                    ) : isAssignedToAnother ? (
                      <div className="text-center md:text-left text-slate-500">
                        Este caso já está com outro advogado.
                      </div>
                    ) : isClosed ? (
                      <div className="text-center md:text-left text-sm space-y-1">
                        <div className="text-green-600 font-medium">
                          {case_.status === 'resolved_by_ai'
                            ? 'Encerrado pela IA'
                            : 'Caso finalizado'}
                        </div>
                        <div className="text-xs text-slate-500">
                          {case_.closedAt ? formatDate(case_.closedAt) : 'Data não disponível'}
                        </div>
                        {case_.resolution && (
                          <div
                            className="text-xs text-slate-600 mt-1 max-h-20 overflow-hidden"
                            title={case_.resolution}
                          >
                            {case_.resolution}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center md:text-left text-slate-500">
                        Aguardando evolução da triagem automática.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
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