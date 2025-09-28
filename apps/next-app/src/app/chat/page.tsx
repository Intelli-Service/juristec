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

  // Renderizar Chat mesmo sem sessão para testar
  return <Chat />;
}