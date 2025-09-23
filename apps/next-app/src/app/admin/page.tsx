'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('ai-config');
  const [aiConfig, setAiConfig] = useState<AIConfig | null>(null);
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
      alert('Configuração atualizada com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar configuração:', error);
      alert('Erro ao atualizar configuração');
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
            <div className="max-w-4xl">
              <h1 className="text-2xl font-bold text-slate-800 mb-6">Relatórios</h1>
              <div className="bg-white rounded-lg shadow-md p-6">
                <p className="text-slate-600">Funcionalidade em desenvolvimento...</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}