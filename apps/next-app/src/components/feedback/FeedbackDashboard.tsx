'use client';

import { useState, useEffect } from 'react';
import { Star, TrendingUp, Users, MessageSquare, Clock } from 'lucide-react';

interface FeedbackStats {
  totalFeedbacks: number;
  averageRating: number;
  averageNps: number;
  averageCsat: number;
  ratingDistribution: Record<string, number>;
  responseTimeAvg: number;
  professionalismAvg: number;
  understandingAvg: number;
}

interface FeedbackDashboardProps {
  lawyerId?: string;
  className?: string;
}

export default function FeedbackDashboard({ lawyerId, className = '' }: FeedbackDashboardProps) {
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, [lawyerId]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const params = lawyerId ? `?lawyerId=${lawyerId}` : '';
      const response = await fetch(`/api/feedback/stats/overview${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch feedback stats');
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-gray-200 h-32 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-red-600">Erro ao carregar estatísticas: {error}</p>
        <button
          onClick={fetchStats}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!stats) return null;

  const getNpsColor = (nps: number) => {
    if (nps >= 50) return 'text-green-600';
    if (nps >= 0) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCsatColor = (csat: number) => {
    if (csat >= 80) return 'text-green-600';
    if (csat >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={className}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Dashboard de Avaliações
        </h2>
        <p className="text-gray-600">
          Acompanhe a satisfação dos seus clientes e melhore seu atendimento
        </p>
      </div>

      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Avaliações</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalFeedbacks}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avaliação Média</p>
              <div className="flex items-center gap-2">
                <p className="text-3xl font-bold text-gray-900">
                  {stats.averageRating.toFixed(1)}
                </p>
                <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
              </div>
            </div>
            <Star className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">NPS</p>
              <p className={`text-3xl font-bold ${getNpsColor(stats.averageNps)}`}>
                {stats.averageNps.toFixed(0)}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">CSAT</p>
              <p className={`text-3xl font-bold ${getCsatColor(stats.averageCsat)}`}>
                {stats.averageCsat.toFixed(0)}%
              </p>
            </div>
            <MessageSquare className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Distribuição de Avaliações */}
      <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Distribuição de Avaliações
        </h3>
        <div className="space-y-3">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = stats.ratingDistribution[rating.toString()] || 0;
            const percentage = stats.totalFeedbacks > 0 ? (count / stats.totalFeedbacks) * 100 : 0;

            return (
              <div key={rating} className="flex items-center gap-3">
                <div className="flex items-center gap-1 min-w-[60px]">
                  <span className="text-sm font-medium text-gray-600">{rating}</span>
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                </div>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600 min-w-[40px] text-right">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Métricas Detalhadas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">
            Tempo de Resposta
          </h4>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">
              {stats.responseTimeAvg.toFixed(1)}
            </span>
            <span className="text-sm text-gray-600">estrelas</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">
            Profissionalismo
          </h4>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-green-600" />
            <span className="text-2xl font-bold text-gray-900">
              {stats.professionalismAvg.toFixed(1)}
            </span>
            <span className="text-sm text-gray-600">estrelas</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">
            Compreensão
          </h4>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-purple-600" />
            <span className="text-2xl font-bold text-gray-900">
              {stats.understandingAvg.toFixed(1)}
            </span>
            <span className="text-sm text-gray-600">estrelas</span>
          </div>
        </div>
      </div>
    </div>
  );
}