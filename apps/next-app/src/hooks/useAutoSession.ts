'use client';

import { useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';

/**
 * Hook que garante que sempre há uma sessão ativa.
 * Se não há sessão, automaticamente cria uma sessão anônima.
 */
export function useAutoSession() {
  const { data: session, status } = useSession();

  useEffect(() => {
    // Se não há sessão e não está carregando, criar sessão anônima
    if (status === 'unauthenticated') {
      console.log('🔑 No session found, creating anonymous session...');
      signIn('anonymous', { redirect: false });
    }
  }, [status]);

  return { session, status };
}