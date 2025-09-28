/**
 * Página de teste para o sistema de múltiplas conversas
 */

import { Metadata } from 'next';
import MultiConversationChat from '../../components/MultiConversationChat';

export const metadata: Metadata = {
  title: 'Múltiplas Conversas - Juristec',
  description: 'Sistema de múltiplas conversas com notificações em tempo real',
};

export default function ChatMultiPage() {
  return (
    <main className="h-screen">
      <MultiConversationChat />
    </main>
  );
}