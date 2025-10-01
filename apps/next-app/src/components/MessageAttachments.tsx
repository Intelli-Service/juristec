'use client';

import { FileText, Image, Download, File } from 'lucide-react';

interface FileAttachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
}

interface MessageAttachmentsProps {
  attachments: FileAttachment[];
  onDownload?: (attachment: FileAttachment) => void;
}

export default function MessageAttachments({ attachments, onDownload }: MessageAttachmentsProps) {
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <Image className="w-5 h-5 text-blue-600" />;
    } else if (mimeType === 'application/pdf') {
      return <FileText className="w-5 h-5 text-red-600" />;
    } else {
      return <File className="w-5 h-5 text-slate-600" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = async (attachment: FileAttachment) => {
    if (onDownload) {
      onDownload(attachment);
    } else {
      // Fallback: tentar download direto (não recomendado para produção)
      try {
        const response = await fetch(`/api/uploads/download/${attachment.id}`);
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = attachment.originalName;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }
      } catch (error) {
        console.error('Erro ao fazer download:', error);
      }
    }
  };

  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="mt-2 space-y-2">
      {attachments.map((attachment, index) => (
        <div
          key={attachment.id || `attachment-${index}`}
          className="flex items-center space-x-3 p-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <div className="flex-shrink-0">
            {getFileIcon(attachment.mimeType)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-800 truncate">
              {attachment.originalName}
            </div>
            <div className="text-xs text-slate-500">
              {formatFileSize(attachment.size)}
            </div>
          </div>
          <button
            onClick={() => handleDownload(attachment)}
            className="flex-shrink-0 p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors"
            title="Download arquivo"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}