import React from 'react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Conversation } from '@/types/chat.types';

interface ChatSidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  createNewConversation: () => void;
  switchToConversation: (conversationId: string) => void;
  markAsRead: (conversationId: string) => void;
  isLoading: boolean;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  conversations,
  activeConversationId,
  sidebarCollapsed,
  setSidebarCollapsed,
  createNewConversation,
  switchToConversation,
  markAsRead,
  isLoading,
}) => {
  const totalUnread = conversations.reduce((total, conv) => total + conv.unreadCount, 0);

  return (
    <Collapsible open={!sidebarCollapsed} onOpenChange={(open) => setSidebarCollapsed(!open)}>
      <div className={`hidden md:flex flex-col bg-white border-r border-slate-200 transition-all duration-300 ${
        sidebarCollapsed ? 'w-16' : 'w-72'
      }`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <h2 className="text-lg font-semibold text-slate-900">Conversas</h2>
            )}
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700"
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </div>

          {!sidebarCollapsed && totalUnread > 0 && (
            <div className="mt-2">
              <span className="bg-emerald-500 text-white text-xs px-2 py-1 rounded-full">
                {totalUnread} não lidas
              </span>
            </div>
          )}
        </div>

        {/* New Conversation Button */}
        {!sidebarCollapsed && (
          <div className="p-4">
            <button
              onClick={createNewConversation}
              disabled={isLoading}
              className="w-full bg-emerald-600 text-white py-2 px-4 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {isLoading ? 'Criando...' : '+ Nova Conversa'}
            </button>
          </div>
        )}

        <Separator />

        {/* Conversations List */}
        <CollapsibleContent className="flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-slate-500">
                <div className="flex flex-col items-center space-y-2">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-sm">Nenhuma conversa</p>
                </div>
              </div>
            ) : (
              conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => {
                    switchToConversation(conversation.id);
                    markAsRead(conversation.id);
                  }}
                  className={`p-3 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${
                    conversation.id === activeConversationId
                      ? 'bg-emerald-50 border-l-4 border-l-emerald-600'
                      : ''
                  }`}
                  title={sidebarCollapsed ? conversation.title : undefined}
                >
                  {sidebarCollapsed ? (
                    <div className="flex flex-col items-center space-y-2">
                      <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      {conversation.unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
                          {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-slate-900 truncate text-sm">
                          {conversation.title}
                        </h3>
                        <p className="text-xs text-slate-600 mt-1">
                          {conversation.classification?.category || 'Não classificado'}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                          conversation.status === 'open'
                            ? 'bg-green-100 text-green-800'
                            : conversation.status === 'assigned'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {conversation.status === 'open' ? 'Aberto' :
                           conversation.status === 'assigned' ? 'Atribuído' : 'Fechado'}
                        </span>

                        {conversation.unreadCount > 0 && (
                          <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
                            {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};
