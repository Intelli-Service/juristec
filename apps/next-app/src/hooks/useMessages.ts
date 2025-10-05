import { useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import { FileAttachment } from '@/types/chat.types';
import { useNotifications } from './useNotifications';

interface UseMessagesProps {
  socket: Socket | null;
  activeConversationId: string | null;
  isLoading: Record<string, boolean>;
  hasStartedConversation: boolean;
  input: string;
  selectedFile: File | null;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  setSelectedFile: React.Dispatch<React.SetStateAction<File | null>>;
  setClearFileTrigger: React.Dispatch<React.SetStateAction<number>>;
  setIsLoading: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setHasStartedConversation: React.Dispatch<React.SetStateAction<boolean>>;
  setIsSendingMessage: React.Dispatch<React.SetStateAction<boolean>>;
  setIsUploadingAttachment: React.Dispatch<React.SetStateAction<boolean>>;
}

export const useMessages = ({
  socket,
  activeConversationId,
  isLoading,
  hasStartedConversation,
  input,
  selectedFile,
  setInput,
  setSelectedFile,
  setClearFileTrigger,
  setIsLoading,
  setHasStartedConversation,
  setIsSendingMessage,
  setIsUploadingAttachment,
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

    setIsSendingMessage(true);
    let uploadedFile: FileAttachment | null = null;

    try {
      if (selectedFile) {
        setIsUploadingAttachment(true);
        const tempMessageId = `temp-${Date.now()}`;
        try {
          uploadedFile = await uploadFile(selectedFile, tempMessageId);
        } finally {
          setIsUploadingAttachment(false);
        }

        if (!uploadedFile) {
          notifications.error('Erro no upload', 'Não foi possível fazer upload do arquivo');
          return;
        }
      }

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
    } finally {
      setIsSendingMessage(false);
    }
  }, [
    input,
    selectedFile,
    socket,
    activeConversationId,
    isLoading,
    hasStartedConversation,
    uploadFile,
    setInput,
    setSelectedFile,
    setClearFileTrigger,
    setIsLoading,
    setHasStartedConversation,
    setIsSendingMessage,
    setIsUploadingAttachment,
    notifications,
  ]);

  return {
    sendMessage,
    handleAttachmentDownload,
  };
};
