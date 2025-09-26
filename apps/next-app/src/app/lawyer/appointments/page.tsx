'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Appointment {
  _id: string;
  conversationId: string;
  clientInfo: {
    name: string;
    email: string;
    phone?: string;
  };
  type: 'video' | 'phone' | 'in_person';
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  scheduledDateTime: string;
  duration: number;
  meetingDetails?: {
    videoLink?: string;
    phoneNumber?: string;
    address?: string;
  };
  notes?: string;
  lawyerNotes?: string;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
  duration: number;
}

interface LawyerAvailability {
  date: string;
  timeSlots: TimeSlot[];
}

export default function LawyerAppointments() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [availability, setAvailability] = useState<LawyerAvailability | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/lawyer/appointments');
      return;
    }

    loadAppointments();
    loadAvailability();
  }, [status, selectedDate]);

  const loadAppointments = async () => {
    try {
      const response = await fetch(`/api/appointments/lawyer/${session?.user?.id}?startDate=${selectedDate}&endDate=${selectedDate}`, {
        headers: {
          'Authorization': `Bearer ${(session as any)?.accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAppointments(data.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailability = async () => {
    try {
      const response = await fetch(`/api/appointments/availability/${session?.user?.id}/${selectedDate}`, {
        headers: {
          'Authorization': `Bearer ${(session as any)?.accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAvailability(data.data);
      }
    } catch (error) {
      console.error('Erro ao carregar disponibilidade:', error);
    }
  };

  const formatDateTime = (dateTimeString: string) => {
    return new Date(dateTimeString).toLocaleString('pt-BR');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'no_show':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return '📹';
      case 'phone':
        return '📞';
      case 'in_person':
        return '🏢';
      default:
        return '📅';
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Agendamentos</h1>
              <p className="text-slate-600 mt-2">Gerencie suas consultas e horários disponíveis</p>
            </div>
            <button
              onClick={() => router.push('/lawyer')}
              className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              Voltar ao Dashboard
            </button>
          </div>
        </div>

        {/* Date Selector */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex items-center space-x-4">
            <label htmlFor="date" className="text-sm font-medium text-slate-700">
              Selecionar Data:
            </label>
            <input
              type="date"
              id="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <button
              onClick={() => {
                loadAppointments();
                loadAvailability();
              }}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Atualizar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Appointments List */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">
                Consultas do Dia ({appointments.length})
              </h2>
            </div>
            
            <div className="p-6">
              {appointments.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-slate-400 text-5xl mb-4">📅</div>
                  <p className="text-slate-600">Nenhuma consulta agendada para esta data</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {appointments.map((appointment) => (
                    <div
                      key={appointment._id}
                      className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-xl">{getTypeIcon(appointment.type)}</span>
                            <h3 className="font-semibold text-slate-900">
                              {appointment.clientInfo.name}
                            </h3>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(appointment.status)}`}>
                              {appointment.status}
                            </span>
                          </div>
                          
                          <div className="text-sm text-slate-600 space-y-1">
                            <p>📧 {appointment.clientInfo.email}</p>
                            {appointment.clientInfo.phone && (
                              <p>📱 {appointment.clientInfo.phone}</p>
                            )}
                            <p>🕐 {formatDateTime(appointment.scheduledDateTime)} ({appointment.duration}min)</p>
                          </div>

                          {appointment.meetingDetails?.videoLink && (
                            <div className="mt-3">
                              <a
                                href={appointment.meetingDetails.videoLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-lg hover:bg-blue-200 transition-colors"
                              >
                                📹 Entrar na Reunião
                              </a>
                            </div>
                          )}

                          {appointment.notes && (
                            <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                              <p className="text-sm text-slate-700">
                                <strong>Observações:</strong> {appointment.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Availability Calendar */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">
                Disponibilidade
              </h2>
            </div>
            
            <div className="p-6">
              {availability ? (
                <div className="space-y-3">
                  <h3 className="font-medium text-slate-900 mb-4">
                    Horários para {new Date(selectedDate).toLocaleDateString('pt-BR')}
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {availability.timeSlots.map((slot, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg text-center text-sm font-medium ${
                          slot.available
                            ? 'bg-green-100 text-green-800 border border-green-200'
                            : 'bg-red-100 text-red-800 border border-red-200'
                        }`}
                      >
                        {slot.startTime} - {slot.endTime}
                        <div className="text-xs mt-1">
                          {slot.available ? '✅ Disponível' : '❌ Ocupado'}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 p-4 bg-slate-50 rounded-lg">
                    <h4 className="font-medium text-slate-900 mb-2">Legenda:</h4>
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-green-100 border border-green-200 rounded"></div>
                        <span>Disponível</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-red-100 border border-red-200 rounded"></div>
                        <span>Ocupado</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-slate-400 text-5xl mb-4">⏰</div>
                  <p className="text-slate-600">Carregando disponibilidade...</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Help Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Como funciona o agendamento?</h3>
          <div className="text-blue-800 text-sm space-y-2">
            <p>• <strong>Agendamento Inteligente:</strong> Os clientes podem solicitar agendamentos via chat com nossa IA</p>
            <p>• <strong>Consultas Automáticas:</strong> Para casos em andamento, os agendamentos são criados automaticamente</p>
            <p>• <strong>Tipos de Consulta:</strong> Presencial (🏢), Vídeo (📹) ou Telefone (📞)</p>
            <p>• <strong>Notificações:</strong> Lembretes automáticos por email e SMS</p>
            <p>• <strong>Reagendamento:</strong> Cancelamento gratuito até 12h antes da consulta</p>
          </div>
        </div>
      </div>
    </div>
  );
}