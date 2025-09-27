'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useNotifications } from '@/hooks/useNotifications';

interface AIConfig {
  systemPrompt: string;
  behaviorSettings: {
    maxTokens: number;
    temperature: number;
    ethicalGuidelines: string[];
    specializationAreas: string[];
  };
  classificationSettings: {
    enabled: boolean;
    categories: string[];
    summaryTemplate: string;
  };
}

interface BillingReport {
  totalCharges: number;
  totalRevenue: number;
  paidCharges: number;
  pendingCharges: number;
  rejectedCharges: number;
  averageChargeValue: number;
  chargesByType: { [key: string]: number };
  chargesByStatus: { [key: string]: number };
  monthlyRevenue: { month: string; revenue: number }[];
  topLawyers: { lawyerId: string; lawyerName: string; totalCharges: number; totalRevenue: number }[];
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const notifications = useNotifications();
  const [activeTab, setActiveTab] = useState('ai-config');
  const [aiConfig, setAiConfig] = useState<AIConfig | null>(null);
  const [billingReport, setBillingReport] = useState<BillingReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return; // Still loading
    
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/admin');
      return;
    }

    if (session && !['super_admin', 'moderator'].includes(session.user.role)) {
      router.push('/auth/signin?error=AccessDenied');
      return;
    }

    if (session) {
      loadAIConfig();
      if (activeTab === 'reports') {
        loadBillingReport();
      }
    }
  }, [session, status, router, activeTab]);

  const loadBillingReport = async () => {
    try {
      const response = await fetch('/api/analytics/dashboard', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setBillingReport(data);
    } catch (error) {
      console.error('Erro ao carregar relatório de cobrança:', error);
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

  const loadAIConfig = async () => {
    try {
      const response = await fetch('/api/admin/ai-config', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setAiConfig(data);
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateAIConfig = async (updates: Partial<AIConfig>) => {
    try {
      const response = await fetch('/api/admin/ai-config', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const updated = await response.json();
      setAiConfig(updated);
      notifications.success('Configuração Atualizada', 'As configurações foram salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar configuração:', error);
      notifications.error('Erro na Configuração', 'Não foi possível atualizar as configurações. Tente novamente.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Carregando painel administrativo...</p>
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
            <span className="text-slate-400">Painel Administrativo</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-emerald-400 font-medium">Super Admin</span>
            <Link
              href="/"
              className="text-slate-300 hover:text-white transition-colors text-sm font-medium"
            >
              ← Voltar ao Site
            </Link>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className="w-64 bg-white shadow-lg min-h-screen">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Administração</h2>
            <div className="space-y-2">
              <button
                onClick={() => setActiveTab('ai-config')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'ai-config'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                🤖 Configuração da IA
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'users'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                👥 Gestão de Usuários
              </button>
              <button
                onClick={() => setActiveTab('cases')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'cases'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                📋 Gestão de Casos
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'reports'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                📊 Relatórios
              </button>
              <Link
                href="/admin/analytics"
                className="w-full text-left px-4 py-2 rounded-lg transition-colors text-slate-600 hover:bg-slate-100 block"
              >
                📈 Analytics
              </Link>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {activeTab === 'ai-config' && (
            <div className="max-w-4xl">
              <h1 className="text-2xl font-bold text-slate-800 mb-6">Configuração do Assistente IA</h1>

              {aiConfig && (
                <div className="space-y-6">
                  {/* System Prompt */}
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-lg font-semibold text-slate-800 mb-4">Prompt do Sistema</h2>
                    <textarea
                      value={aiConfig.systemPrompt}
                      onChange={(e) => setAiConfig({...aiConfig, systemPrompt: e.target.value})}
                      className="w-full h-64 p-4 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Digite as instruções do assistente IA..."
                    />
                    <button
                      onClick={() => updateAIConfig({ systemPrompt: aiConfig.systemPrompt })}
                      className="mt-4 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      Salvar Prompt
                    </button>
                  </div>

                  {/* Behavior Settings */}
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-lg font-semibold text-slate-800 mb-4">Configurações de Comportamento</h2>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Máximo de Tokens
                        </label>
                        <input
                          type="number"
                          value={aiConfig.behaviorSettings.maxTokens}
                          onChange={(e) => setAiConfig({
                            ...aiConfig,
                            behaviorSettings: {
                              ...aiConfig.behaviorSettings,
                              maxTokens: parseInt(e.target.value)
                            }
                          })}
                          className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Temperatura
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="1"
                          value={aiConfig.behaviorSettings.temperature}
                          onChange={(e) => setAiConfig({
                            ...aiConfig,
                            behaviorSettings: {
                              ...aiConfig.behaviorSettings,
                              temperature: parseFloat(e.target.value)
                            }
                          })}
                          className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => updateAIConfig({ behaviorSettings: aiConfig.behaviorSettings })}
                      className="mt-4 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      Salvar Configurações
                    </button>
                  </div>

                  {/* Classification Settings */}
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-lg font-semibold text-slate-800 mb-4">Configurações de Classificação</h2>
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={aiConfig.classificationSettings.enabled}
                          onChange={(e) => setAiConfig({
                            ...aiConfig,
                            classificationSettings: {
                              ...aiConfig.classificationSettings,
                              enabled: e.target.checked
                            }
                          })}
                          className="mr-2"
                        />
                        <label className="text-sm font-medium text-slate-700">
                          Habilitar classificação automática de conversas
                        </label>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Template de Resumo
                        </label>
                        <input
                          type="text"
                          value={aiConfig.classificationSettings.summaryTemplate}
                          onChange={(e) => setAiConfig({
                            ...aiConfig,
                            classificationSettings: {
                              ...aiConfig.classificationSettings,
                              summaryTemplate: e.target.value
                            }
                          })}
                          className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => updateAIConfig({ classificationSettings: aiConfig.classificationSettings })}
                      className="mt-4 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      Salvar Classificação
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="max-w-4xl">
              <h1 className="text-2xl font-bold text-slate-800 mb-6">Gestão de Usuários</h1>
              <div className="bg-white rounded-lg shadow-md p-6">
                <p className="text-slate-600">Funcionalidade em desenvolvimento...</p>
              </div>
            </div>
          )}

          {activeTab === 'cases' && (
            <div className="max-w-4xl">
              <h1 className="text-2xl font-bold text-slate-800 mb-6">Gestão de Casos</h1>
              <div className="bg-white rounded-lg shadow-md p-6">
                <p className="text-slate-600">Funcionalidade em desenvolvimento...</p>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="max-w-7xl">
              <h1 className="text-2xl font-bold text-slate-800 mb-6">Relatórios de Cobrança</h1>

              {!billingReport ? (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
                    <p className="mt-2 text-slate-600">Carregando relatórios...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Overview Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white rounded-lg shadow-md p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-600">Total de Receita</p>
                          <p className="text-2xl font-bold text-emerald-600">
                            R$ {billingReport.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                          <span className="text-2xl">💰</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-600">Cobranças Pagas</p>
                          <p className="text-2xl font-bold text-green-600">{billingReport.paidCharges}</p>
                        </div>
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-2xl">✅</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-600">Cobranças Pendentes</p>
                          <p className="text-2xl font-bold text-yellow-600">{billingReport.pendingCharges}</p>
                        </div>
                        <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                          <span className="text-2xl">⏳</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-600">Valor Médio</p>
                          <p className="text-2xl font-bold text-blue-600">
                            R$ {billingReport.averageChargeValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-2xl">📊</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Charts Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Charges by Status */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                      <h3 className="text-lg font-semibold text-slate-800 mb-4">Cobranças por Status</h3>
                      <div className="space-y-3">
                        {Object.entries(billingReport.chargesByStatus).map(([status, count]) => (
                          <div key={status} className="flex items-center justify-between">
                            <span className="text-sm text-slate-600 capitalize">{status}</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-24 bg-slate-200 rounded-full h-2">
                                <div
                                  className="bg-emerald-600 h-2 rounded-full"
                                  style={{
                                    width: `${(count / billingReport.totalCharges) * 100}%`
                                  }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-slate-800 w-8 text-right">{count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Charges by Type */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                      <h3 className="text-lg font-semibold text-slate-800 mb-4">Cobranças por Tipo</h3>
                      <div className="space-y-3">
                        {Object.entries(billingReport.chargesByType).map(([type, count]) => (
                          <div key={type} className="flex items-center justify-between">
                            <span className="text-sm text-slate-600 capitalize">{type.replace('_', ' ')}</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-24 bg-slate-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{
                                    width: `${(count / billingReport.totalCharges) * 100}%`
                                  }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-slate-800 w-8 text-right">{count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Monthly Revenue Chart */}
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Receita Mensal</h3>
                    <div className="h-64 flex items-end justify-between space-x-2">
                      {billingReport.monthlyRevenue.map((month, index) => (
                        <div key={month.month} className="flex-1 flex flex-col items-center">
                          <div
                            className="w-full bg-emerald-600 rounded-t"
                            style={{
                              height: `${(month.revenue / Math.max(...billingReport.monthlyRevenue.map(m => m.revenue))) * 200}px`,
                              minHeight: '4px'
                            }}
                          ></div>
                          <span className="text-xs text-slate-600 mt-2">{month.month}</span>
                          <span className="text-xs font-medium text-slate-800">
                            R$ {month.revenue.toLocaleString('pt-BR')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Lawyers */}
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Top Advogados</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Advogado</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Cobranças</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Receita</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {billingReport.topLawyers.map((lawyer, index) => (
                            <tr key={lawyer.lawyerId} className="hover:bg-slate-50">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center mr-3">
                                    <span className="text-sm font-medium text-emerald-800">
                                      {lawyer.lawyerName.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <span className="text-sm font-medium text-slate-900">{lawyer.lawyerName}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">
                                {lawyer.totalCharges}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-emerald-600">
                                R$ {lawyer.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
          )}
        </main>
      </div>
    </div>
  );
}