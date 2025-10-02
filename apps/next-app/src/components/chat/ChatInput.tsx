import React from 'react';
import FileUpload from '@/components/FileUpload';

interface ChatInputProps {
  input: string;
  setInput: (input: string) => void;
  sendMessage: () => void;
  sendFileMessage: (file: File) => void;
  setSelectedFile: (file: File | null) => void;
  isLoading: boolean;
  isConnected: boolean;
  selectedFile: File | null;
  clearFileTrigger: number;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  sendMessage,
  sendFileMessage,
  setSelectedFile,
  isLoading,
  isConnected,
  selectedFile,
  clearFileTrigger,
}) => {
  return (
    <div className="p-4 bg-white border-t border-slate-200">
      <div className="flex space-x-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Digite sua mensagem jurídica..."
          className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors text-slate-800 placeholder-slate-500"
          disabled={isLoading}
          data-testid="chat-input"
        />
        <FileUpload
          onFileSelect={setSelectedFile}
          onFileSend={sendFileMessage}
          disabled={isLoading}
          clearTrigger={clearFileTrigger}
          inline={true}
        />
        <button
          onClick={sendMessage}
          disabled={isLoading || (!input.trim() && !selectedFile) || !isConnected}
          className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          data-testid="send-button"
          type="button"
        >
          {isLoading ? 'Enviando...' : !isConnected ? 'Conectando...' : 'Enviar'}
        </button>
      </div>
    </div>
  );
};
