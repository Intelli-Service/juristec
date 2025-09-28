'use client';

import { useEffect, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import Chat from '@/components/Chat';

export default function ChatPage() {
  const { data: session, status } = useSession();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initializeAnonymousSession = async () => {
      if (status === 'loading') return;

      // Se não há sessão, fazer login anônimo
      if (!session) {
        try {
          console.log('Criando sessão anônima...');
          await signIn('anonymous', { redirect: false });
        } catch (error) {
          console.error('Erro ao criar sessão anônima:', error);
        }
      }

      setIsInitializing(false);
    };

    initializeAnonymousSession();
  }, [session, status]);

  // Mostrar loading enquanto inicializa
  if (status === 'loading' || isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Preparando seu chat...</p>
        </div>
      </div>
    );
  }

  // Se ainda não há sessão após tentar login anônimo, mostrar erro
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">Erro ao inicializar sessão</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return <Chat />;
}