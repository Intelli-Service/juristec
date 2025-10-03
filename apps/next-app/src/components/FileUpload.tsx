'use client';

import { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { AlertCircle, Upload, X, File, FileText, Image as ImageIcon, Video, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  disabled?: boolean;
  onShowHelp?: () => void;
  clearTrigger?: number;
  inline?: boolean; // New prop for inline mode (button next to send button)
}

export default function FileUpload({
  onFileSelect,
  disabled = false,
  onShowHelp,
  clearTrigger = 0,
  inline = false
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Clear file when clearTrigger changes (increments)
  useEffect(() => {
    if (clearTrigger > 0) {
      setSelectedFile(null);
      setError(null);
      if (inline) {
        setIsExpanded(false);
      }
      onFileSelect(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [clearTrigger, inline, onFileSelect]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { error: showErrorToast } = useNotifications();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    // Reset states
    setError(null);
    
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
    ];

    if (!allowedTypes.includes(file.type)) {
      const errorMessage = 'Tipo de arquivo não permitido. Use apenas PDF, DOC, DOCX, JPG ou PNG.';
      setError(errorMessage);
      showErrorToast(
        'Arquivo não suportado',
        errorMessage,
        onShowHelp ? {
          label: 'Ver tipos aceitos',
          onClick: onShowHelp
        } : undefined
      );
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      const errorMessage = 'Arquivo muito grande. O tamanho máximo é 10MB.';
      setError(errorMessage);
      showErrorToast('Arquivo muito grande', errorMessage);
      return;
    }

    setSelectedFile(file);
    onFileSelect(file);
    if (inline) {
      setIsExpanded(false);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const clearFile = (notifyParent: boolean = true) => {
    setSelectedFile(null);
    setError(null);
    if (inline) {
      setIsExpanded(false);
    }
    if (notifyParent) {
      onFileSelect(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file: File) => {
    const type = file.type;
  if (type.startsWith('image/')) return <ImageIcon aria-hidden="true" className="w-6 h-6 text-blue-500" />;
  if (type.startsWith('video/')) return <Video aria-hidden="true" className="w-6 h-6 text-red-500" />;
  if (type.includes('pdf')) return <FileText aria-hidden="true" className="w-6 h-6 text-red-600" />;
  if (type.includes('document') || type.includes('word')) return <FileText aria-hidden="true" className="w-6 h-6 text-blue-600" />;
  if (type.includes('zip') || type.includes('rar')) return <Archive aria-hidden="true" className="w-6 h-6 text-yellow-500" />;
  return <File aria-hidden="true" className="w-6 h-6 text-gray-500" />;
  };

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleInputChange}
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
        className="hidden"
        disabled={disabled}
        data-testid="file-input"
      />

      {inline ? (
        // Inline mode: Small attachment button that shows modal when clicked
        <>
          {/* Attachment Button */}
          <button
            onClick={() => setIsExpanded(true)}
            disabled={disabled}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
            title="Anexar arquivo"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>

          {/* Upload Modal */}
          <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  Anexar Arquivo
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(false)}
                    className="h-6 w-6 p-0 text-slate-500 hover:text-slate-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Drag & Drop Area */}
                <div
                  data-testid="upload-area"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => !disabled && fileInputRef.current?.click()}
                  className={`
                    border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200
                    ${isDragOver
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                    ${error ? 'border-red-300 bg-red-50' : ''}
                  `}
                >
                  <div className="flex flex-col items-center space-y-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      error ? 'bg-red-100' : 'bg-slate-100'
                    }`}>
                      <Upload className={`w-4 h-4 ${error ? 'text-red-500' : 'text-slate-400'}`} />
                    </div>
                    <div className="text-sm text-slate-600">
                      <span className="font-medium text-emerald-600">Clique para escolher</span> ou arraste um arquivo
                    </div>
                    <div className="text-xs text-slate-500">
                      PDF, DOC, DOCX, JPG, PNG (máx. 10MB)
                    </div>
                  </div>
                </div>

                {/* Selected File Preview */}
                {selectedFile && (
                  <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                    <div className="flex items-center space-x-3">
                      {getFileIcon(selectedFile)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-slate-600">
                          {formatFileSize(selectedFile.size)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => clearFile()}
                        className="h-6 w-6 p-0 text-slate-500 hover:text-slate-700"
                        disabled={disabled}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      clearFile(false);
                      setIsExpanded(false);
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </>
      ) : (
        // Original full mode
        <>
          {!selectedFile ? (
            <div
              data-testid="upload-area"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !disabled && fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all duration-200
                ${isDragOver
                  ? 'border-emerald-500 bg-emerald-50 scale-105'
                  : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                ${error ? 'border-red-300 bg-red-50' : ''}
              `}
            >
              <div className="flex flex-col items-center space-y-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  error ? 'bg-red-100' : 'bg-slate-100'
                }`}>
                  <Upload className={`w-4 h-4 ${error ? 'text-red-500' : 'text-slate-400'}`} />
                </div>
                <div className="text-sm text-slate-600">
                  <span className="font-medium text-emerald-600">Clique para escolher</span> ou arraste um arquivo
                </div>
                <div className="text-xs text-slate-500">
                  PDF, DOC, DOCX, JPG, PNG (máx. 10MB)
                </div>
              </div>
            </div>
          ) : (
            <div className={`border rounded-lg p-3 transition-all duration-200 ${
              error
                ? 'border-red-300 bg-red-50'
                : 'border-slate-300 bg-slate-50'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    error ? 'bg-red-100' : 'bg-emerald-100'
                  }`}>
                    {error ? (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    ) : (
                      <Upload className="w-4 h-4 text-emerald-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium truncate max-w-48 ${
                      error ? 'text-red-800' : 'text-slate-800'
                    }`}>
                      {selectedFile.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatFileSize(selectedFile.size)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => clearFile()}
                  className="text-slate-400 hover:text-slate-600 transition-colors ml-2"
                  disabled={disabled}
                  aria-label="Remover arquivo"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Error message inline */}
      {error && !selectedFile && (
        <div className="mt-2 flex items-center space-x-2 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
          {onShowHelp && (
            <button
              onClick={onShowHelp}
              className="underline hover:no-underline text-red-700"
            >
              Ver tipos aceitos
            </button>
          )}
        </div>
      )}
    </div>
  );
}
