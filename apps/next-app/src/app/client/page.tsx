'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Charge {
  _id: string;
  conversationId: string;
  lawyerId: string;
  clientId: string;
  amount: number;
  type: string;
  title: string;
  description: string;
  reason: string;
  status: 'pending' | 'accepted' | 'rejected' | 'paid';
  paymentId?: string;
  createdAt: string;
  updatedAt: string;
  lawyer?: {
    name: string;
    email: string;
  };
  conversation?: {
    roomId: string;
    classification: {
      category: string;
      legalArea: string;
    };
  };
}

interface ClientStats {
  totalCharges: number;
  pendingCharges: number;
  paidCharges: number;
  rejectedCharges: number;
  totalAmount: number;
  paidAmount: number;
}

export default function ClientDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [charges, setCharges] = useState<Charge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, paid, rejected
  const [stats, setStats] = useState<ClientStats | null>(null);

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/client');
      return;
    }

    if (session && session.user.role !== 'client') {
      router.push('/auth/signin?error=AccessDenied');
      return;
    }

    if (session) {
      loadCharges();
      loadStats();
    }
  }, [session, status, router]);

  const loadCharges = async () => {
    try {
      const response = await fetch('/api/billing/client-charges', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setCharges(data);
    } catch (error) {
      console.error('Erro ao carregar cobranças:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/billing/client-stats', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-blue-100 text-blue-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'accepted': return 'Aceita';
      case 'paid': return 'Paga';
      case 'rejected': return 'Rejeitada';
      default: return status;
    }
  };

  const filteredCharges = charges.filter(charge => {
    if (filter === 'all') return true;
    return charge.status === filter;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-slate-900 shadow-lg border-b border-slate-800 px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2">
              <div className="text-2xl font-bold text-white">Juristec<span className="text-emerald-400">.com.br</span></div>
            </Link>
            <span className="text-slate-400">|</span>
            <span className="text-slate-300">Dashboard do Cliente</span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-slate-400 text-sm">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <span>Online</span>
            </div>
            <Link
              href="/"
              className="text-slate-300 hover:text-white transition-colors text-sm font-medium"
            >
              Voltar ao Chat
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total de Cobranças</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.totalCharges}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">💰</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Cobranças Pagas</p>
                  <p className="text-2xl font-bold text-green-600">{stats.paidCharges}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">✅</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Valor Total Pago</p>
                  <p className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.paidAmount)}</p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">💵</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Pendentes</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pendingCharges}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">⏳</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-800">Histórico de Cobranças</h2>
            <div className="flex space-x-2">
              {[
                { key: 'all', label: 'Todas', count: charges.length },
                { key: 'pending', label: 'Pendentes', count: charges.filter(c => c.status === 'pending').length },
                { key: 'paid', label: 'Pagas', count: charges.filter(c => c.status === 'paid').length },
                { key: 'rejected', label: 'Rejeitadas', count: charges.filter(c => c.status === 'rejected').length },
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === key
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {label} ({count})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Charges List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
              <p className="mt-2 text-slate-600">Carregando cobranças...</p>
            </div>
          ) : filteredCharges.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📄</span>
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">Nenhuma cobrança encontrada</h3>
              <p className="text-slate-600">
                {filter === 'all'
                  ? 'Você ainda não recebeu nenhuma cobrança.'
                  : `Nenhuma cobrança ${filter === 'pending' ? 'pendente' : filter === 'paid' ? 'paga' : 'rejeitada'} encontrada.`
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Serviço
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Advogado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {filteredCharges.map((charge) => (
                    <tr key={charge._id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-slate-900">{charge.title}</div>
                          <div className="text-sm text-slate-500">{charge.type}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-900">
                          {charge.lawyer?.name || 'Advogado'}
                        </div>
                        <div className="text-sm text-slate-500">
                          {charge.conversation?.classification?.legalArea || 'Área jurídica'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">
                          {formatCurrency(charge.amount)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(charge.status)}`}>
                          {getStatusText(charge.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {new Date(charge.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {charge.status === 'pending' && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {/* TODO: Implement accept charge */}}
                              className="text-green-600 hover:text-green-900"
                            >
                              Aceitar
                            </button>
                            <button
                              onClick={() => {/* TODO: Implement reject charge */}}
                              className="text-red-600 hover:text-red-900"
                            >
                              Rejeitar
                            </button>
                          </div>
                        )}
                        {charge.status === 'paid' && charge.paymentId && (
                          <button
                            onClick={() => {/* TODO: Show receipt */}}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Ver Recibo
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}