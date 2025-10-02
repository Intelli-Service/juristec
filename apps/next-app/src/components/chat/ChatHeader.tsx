import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ChatHeaderProps {
  isConnected: boolean;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  isConnected,
  sidebarCollapsed,
  setSidebarCollapsed,
}) => {
  return (
    <header className="bg-slate-900 shadow-lg border-b border-slate-800 px-4 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden md:flex text-slate-400 hover:text-white hover:bg-slate-800"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
            <span className="sr-only">Alternar sidebar</span>
          </Button>

          <Link href="/" className="flex items-center space-x-2">
            <div className="text-2xl font-bold text-white">
              Juristec<span className="text-emerald-400">.com.br</span>
            </div>
          </Link>
          <div className="hidden sm:block text-slate-400 text-sm">
            Assistente Jurídico Inteligente
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-slate-400 text-sm">
            <div className={`w-2 h-2 rounded-full animate-pulse ${isConnected ? 'bg-emerald-400' : 'bg-amber-400'}`}></div>
            <span>{isConnected ? 'Online' : 'Conectando...'}</span>
          </div>
          <Link
            href="/"
            className="text-slate-300 hover:text-white transition-colors text-sm font-medium"
          >
            ← Voltar ao Início
          </Link>
        </div>
      </div>
    </header>
  );
};
