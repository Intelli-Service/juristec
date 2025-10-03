import React, { useMemo } from 'react';
import { Loader2, Paperclip, X } from 'lucide-react';
import FileUpload from '@/components/FileUpload';

interface ChatInputProps {
  input: string;
  setInput: (input: string) => void;
  sendMessage: () => void;
  setSelectedFile: (file: File | null) => void;
  isConnected: boolean;
  selectedFile: File | null;
  clearFileTrigger: number;
  onClearSelectedFile: () => void;
  isSendingMessage: boolean;
  isUploadingAttachment: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  sendMessage,
  setSelectedFile,
  isConnected,
  selectedFile,
  clearFileTrigger,
  onClearSelectedFile,
  isSendingMessage,
  isUploadingAttachment,
}) => {
  const formattedSize = useMemo(() => {
    if (!selectedFile) return '';

    const bytes = selectedFile.size;
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }, [selectedFile]);

  return (
    <div className="p-4 bg-white border-t border-slate-200">
      {selectedFile && (
        <div className="mb-3">
          <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 shadow-sm">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-500/10">
                {isUploadingAttachment ? (
                  <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-emerald-600" />
                ) : (
                  <Paperclip aria-hidden="true" className="h-5 w-5 text-emerald-600" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900" title={selectedFile.name}>
                  {selectedFile.name}
                </p>
                <p className="text-xs text-slate-600">
                  {isUploadingAttachment ? 'Enviando arquivo...' : 'Será enviado com a próxima mensagem'}
                  {formattedSize ? ` • ${formattedSize}` : ''}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClearSelectedFile}
              className="ml-3 inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent bg-white text-slate-500 transition-colors hover:border-slate-200 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Remover arquivo anexado"
              disabled={isUploadingAttachment}
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      <div className="flex space-x-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Digite sua mensagem jurídica..."
          className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors text-slate-800 placeholder-slate-500"
          disabled={(!isConnected) || isSendingMessage || isUploadingAttachment}
          data-testid="chat-input"
        />
        <FileUpload
          onFileSelect={setSelectedFile}
          disabled={isSendingMessage || isUploadingAttachment}
          clearTrigger={clearFileTrigger}
          inline={true}
        />
        <button
          onClick={sendMessage}
          disabled={
            isSendingMessage ||
            isUploadingAttachment ||
            (!input.trim() && !selectedFile) ||
            !isConnected
          }
          className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          data-testid="send-button"
          type="button"
        >
          {isUploadingAttachment
            ? 'Enviando arquivo...'
            : isSendingMessage
            ? 'Enviando...'
            : !isConnected
            ? 'Conectando...'
            : 'Enviar'}
        </button>
      </div>
    </div>
  );
};
