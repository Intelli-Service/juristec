'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface AnalyticsMetrics {
  conversion: {
    totalConversations: number;
    conversationsWithCharges: number;
    conversionRate: number;
    averageChargeValue: number;
  };
  financial: {
    totalRevenue: number;
    totalCharges: number;
    paidCharges: number;
    pendingCharges: number;
    rejectedCharges: number;
    averageRevenuePerConversation: number;
    monthlyRevenue: { month: string; revenue: number }[];
  };
  users: {
    totalUsers: number;
    activeLawyers: number;
    totalClients: number;
    newUsersThisMonth: number;
  };
  performance: {
    averageResponseTime: number;
    averageConversationDuration: number;
    resolutionRate: number;
    satisfactionScore: number;
  };
  lawyers: {
    topLawyers: {
      lawyerId: string;
      lawyerName: string;
      totalCharges: number;
    }[];
  };
}

export default function AnalyticsDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    period: 'month' as 'day' | 'week' | 'month' | 'year',
    segment: 'all' as 'all' | 'client' | 'lawyer' | 'admin'
  });

  const fetchAnalytics = useCallback(async () => {
    try {
      setIsLoading(true);
      const queryParams = new URLSearchParams();

      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.period) queryParams.append('period', filters.period);
      if (filters.segment !== 'all') queryParams.append('segment', filters.segment);

      const response = await fetch(`/api/analytics/dashboard?${queryParams}`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Erro ao buscar analytics:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/admin/analytics');
      return;
    }

    if (session?.user?.role !== 'super_admin' && session?.user?.role !== 'admin') {
      router.push('/admin');
      return;
    }

    fetchAnalytics();
  }, [status, session, filters, router, fetchAnalytics]);

  const exportData = async (format: 'csv' | 'json') => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('format', format);

      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.period) queryParams.append('period', filters.period);
      if (filters.segment !== 'all') queryParams.append('segment', filters.segment);

      const response = await fetch(`/api/analytics/export?${queryParams}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-report.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Analytics & Relatórios</h1>
              <p className="mt-1 text-sm text-slate-600">
                Métricas completas de performance e negócio
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => exportData('csv')}
                className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
              >
                Exportar CSV
              </button>
              <button
                onClick={() => exportData('json')}
                className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
              >
                Exportar JSON
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Filtros</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Data Inicial
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Data Final
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Período
              </label>
              <select
                value={filters.period}
                onChange={(e) => setFilters({ ...filters, period: e.target.value as 'day' | 'week' | 'month' | 'year' })}
                className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="day">Diário</option>
                <option value="week">Semanal</option>
                <option value="month">Mensal</option>
                <option value="year">Anual</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Segmento
              </label>
              <select
                value={filters.segment}
                onChange={(e) => setFilters({ ...filters, segment: e.target.value as 'all' | 'client' | 'lawyer' | 'admin' })}
                className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Todos</option>
                <option value="client">Clientes</option>
                <option value="lawyer">Advogados</option>
                <option value="admin">Administradores</option>
              </select>
            </div>
          </div>
        </div>

        {analytics && (
          <div className="space-y-8">
            {/* Conversion Metrics */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-6">Métricas de Conversão</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-emerald-600">{analytics.conversion.totalConversations}</div>
                  <div className="text-sm text-slate-600">Conversas Totais</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{analytics.conversion.conversationsWithCharges}</div>
                  <div className="text-sm text-slate-600">Conversas com Cobrança</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">{analytics.conversion.conversionRate.toFixed(1)}%</div>
                  <div className="text-sm text-slate-600">Taxa de Conversão</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">R$ {analytics.conversion.averageChargeValue.toFixed(2)}</div>
                  <div className="text-sm text-slate-600">Valor Médio</div>
                </div>
              </div>
            </div>

            {/* Financial Metrics */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-6">Métricas Financeiras</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">R$ {analytics.financial.totalRevenue.toFixed(2)}</div>
                  <div className="text-sm text-slate-600">Receita Total</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{analytics.financial.totalCharges}</div>
                  <div className="text-sm text-slate-600">Total de Cobranças</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-emerald-600">{analytics.financial.paidCharges}</div>
                  <div className="text-sm text-slate-600">Cobranças Pagas</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600">{analytics.financial.pendingCharges}</div>
                  <div className="text-sm text-slate-600">Cobranças Pendentes</div>
                </div>
              </div>

              {/* Monthly Revenue Chart Placeholder */}
              <div className="mt-6">
                <h3 className="text-lg font-medium text-slate-900 mb-4">Receita Mensal</h3>
                <div className="bg-slate-50 rounded-lg p-8 text-center text-slate-500">
                  Gráfico de receita mensal será implementado com Chart.js
                </div>
              </div>
            </div>

            {/* User Metrics */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-6">Métricas de Usuários</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-indigo-600">{analytics.users.totalUsers}</div>
                  <div className="text-sm text-slate-600">Total de Usuários</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{analytics.users.activeLawyers}</div>
                  <div className="text-sm text-slate-600">Advogados Ativos</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{analytics.users.totalClients}</div>
                  <div className="text-sm text-slate-600">Total de Clientes</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">{analytics.users.newUsersThisMonth}</div>
                  <div className="text-sm text-slate-600">Novos Usuários (Mês)</div>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-6">Métricas de Performance</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">{analytics.performance.averageResponseTime.toFixed(1)}min</div>
                  <div className="text-sm text-slate-600">Tempo Médio de Resposta</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{analytics.performance.averageConversationDuration.toFixed(1)}min</div>
                  <div className="text-sm text-slate-600">Duração Média</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{analytics.performance.resolutionRate.toFixed(1)}%</div>
                  <div className="text-sm text-slate-600">Taxa de Resolução</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">{analytics.performance.satisfactionScore.toFixed(1)}</div>
                  <div className="text-sm text-slate-600">Score de Satisfação</div>
                </div>
              </div>
            </div>

            {/* Top Lawyers */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-6">Top Advogados</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Advogado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Total de Cobranças
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {analytics.lawyers.topLawyers.map((lawyer) => (
                      <tr key={lawyer.lawyerId}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                          {lawyer.lawyerName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {lawyer.totalCharges}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}