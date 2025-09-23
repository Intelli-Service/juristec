'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
  createdAt: string;
  updatedAt: string;
}

export default function LawyerDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [cases, setCases] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, open, assigned

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
      alert('Caso atribuído com sucesso!');
    } catch (error) {
      console.error('Erro ao atribuir caso:', error);
      alert('Erro ao atribuir caso');
    }
  };

  const filteredCases = cases.filter(case_ => {
    if (filter === 'all') return true;
    if (filter === 'open') return case_.status === 'open';
    if (filter === 'assigned') return case_.assignedTo;
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
              Atribuídos ({cases.filter(c => c.assignedTo).length})
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
                  ) : case_.assignedTo ? (
                    <div className="text-center">
                      <div className="text-emerald-600 font-medium text-sm mb-2">
                        Caso atribuído a você
                      </div>
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                        Ver Chat Completo
                      </button>
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
               filter === 'assigned' ? 'Você não tem casos atribuídos.' :
               'Nenhum caso disponível.'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}