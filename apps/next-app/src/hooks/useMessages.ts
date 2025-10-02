import { useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import { Message, FileAttachment } from '@/types/chat.types';
import { useNotifications } from './useNotifications';

interface UseMessagesProps {
  socket: Socket | null;
  activeConversationId: string | null;
  isLoading: Record<string, boolean>;
  hasStartedConversation: boolean;
  input: string;
  selectedFile: File | null;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  setSelectedFile: React.Dispatch<React.SetStateAction<File | null>>;
  setClearFileTrigger: React.Dispatch<React.SetStateAction<number>>;
  setIsLoading: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setHasStartedConversation: React.Dispatch<React.SetStateAction<boolean>>;
}

export const useMessages = ({
  socket,
  activeConversationId,
  isLoading,
  hasStartedConversation,
  input,
  selectedFile,
  setMessages,
  setInput,
  setSelectedFile,
  setClearFileTrigger,
  setIsLoading,
  setHasStartedConversation,
}: UseMessagesProps) => {
  const notifications = useNotifications();

  const uploadFile = useCallback(async (file: File, messageId?: string): Promise<FileAttachment | null> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('conversationId', activeConversationId || '');
      if (messageId) {
        formData.append('messageId', messageId);
      }

      console.log(`📤 UPLOAD DEBUG - Frontend:`, {
        file: file.name,
        activeConversationId,
        messageId,
        usingConversationId: activeConversationId || ''
      });

      const response = await fetch('/api/uploads', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || 'Erro ao fazer upload do arquivo');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Erro no upload:', error);
      return null;
    }
  }, [activeConversationId]);

  const handleAttachmentDownload = useCallback(async (attachment: FileAttachment) => {
    try {
      console.log('📥 DOWNLOAD DEBUG - Dados do attachment:', attachment);
      
      // Validação: verificar se o ID existe
      if (!attachment?.id) {
        console.error('❌ ERRO: attachment.id está undefined/null:', attachment);
        notifications.error('Erro no download', 'ID do arquivo não encontrado');
        return;
      }

      console.log(`📥 Iniciando download: /api/uploads/download/${attachment.id}`);
      const response = await fetch(`/api/uploads/download/${attachment.id}`, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Erro desconhecido');
        console.error('❌ Erro na resposta do servidor:', response.status, errorText);
        throw new Error('Erro ao fazer download do arquivo');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.originalName;
      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      notifications.success('Download concluído', `Arquivo ${attachment.originalName} baixado com sucesso`);
    } catch (error) {
      console.error('Erro no download:', error);
      notifications.error('Erro no download', 'Não foi possível baixar o arquivo');
    }
  }, [notifications]);

  const sendMessage = useCallback(async () => {
    if ((!input.trim() && !selectedFile) || !socket || !activeConversationId || (activeConversationId && isLoading[activeConversationId])) return;

    let uploadedFile: FileAttachment | null = null;
    if (selectedFile) {
      const tempMessageId = `temp-${Date.now()}`;
      uploadedFile = await uploadFile(selectedFile, tempMessageId);
      if (!uploadedFile) {
        notifications.error('Erro no upload', 'Não foi possível fazer upload do arquivo');
        return;
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input.trim() || (uploadedFile ? uploadedFile.originalName : ''),
      sender: 'user',
      attachments: uploadedFile ? [uploadedFile] : [],
      conversationId: activeConversationId || undefined,
    };

    setMessages((prev) => [...prev, userMessage]);

    const messageToSend = input.trim() || (uploadedFile ? uploadedFile.originalName : '');
    const attachmentsToSend = uploadedFile ? [uploadedFile] : [];

    setInput('');
    setSelectedFile(null);
    setClearFileTrigger(prev => prev + 1);

    if (activeConversationId) {
      setIsLoading(prev => ({ ...prev, [activeConversationId]: true }));
    }

    if (!hasStartedConversation && (input.trim() || selectedFile)) {
      setHasStartedConversation(true);
    }

    socket.emit('send-message', {
      text: messageToSend,
      attachments: attachmentsToSend,
      conversationId: activeConversationId,
    });
  }, [
    input,
    selectedFile,
    socket,
    activeConversationId,
    isLoading,
    hasStartedConversation,
    uploadFile,
    setMessages,
    setInput,
    setSelectedFile,
    setClearFileTrigger,
    setIsLoading,
    setHasStartedConversation,
    notifications,
  ]);

  const sendFileMessage = useCallback(async (file: File) => {
    if (!socket || !activeConversationId || (activeConversationId && isLoading[activeConversationId])) return;

    const tempMessageId = `temp-${Date.now()}`;
    const uploadedFile = await uploadFile(file, tempMessageId);
    if (!uploadedFile) {
      notifications.error('Erro no upload', 'Não foi possível fazer upload do arquivo');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: uploadedFile.originalName,
      sender: 'user',
      attachments: [uploadedFile],
      conversationId: activeConversationId || undefined,
    };

    setMessages((prev) => [...prev, userMessage]);

    setSelectedFile(null);
    setClearFileTrigger(prev => prev + 1);

    if (activeConversationId) {
      setIsLoading(prev => ({ ...prev, [activeConversationId]: true }));
    }

    if (!hasStartedConversation) {
      setHasStartedConversation(true);
    }

    socket.emit('send-message', {
      text: uploadedFile.originalName,
      attachments: [uploadedFile],
      conversationId: activeConversationId,
    });
  }, [
    socket,
    activeConversationId,
    isLoading,
    hasStartedConversation,
    uploadFile,
    setMessages,
    setSelectedFile,
    setClearFileTrigger,
    setIsLoading,
    setHasStartedConversation,
    notifications,
  ]);

  return {
    sendMessage,
    sendFileMessage,
    handleAttachmentDownload,
  };
};
