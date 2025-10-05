export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai' | 'system' | 'lawyer';
  attachments?: FileAttachment[];
  conversationId?: string;
  lawyerName?: string;
  lawyerId?: string;
  lawyerLicenseNumber?: string;
}

export interface FileAttachment {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface Conversation {
  id: string;
  roomId: string;
  title: string;
  status: string;
  unreadCount: number;
  lastMessageAt: Date;
  classification?: {
    category: string;
    complexity: string;
    legalArea: string;
  };
}

export interface CaseAssignment {
  assigned: boolean;
  lawyerName?: string;
  lawyerId?: string;
  lawyerLicenseNumber?: string;
}

export interface ChargeFormData {
  type: string;
  amount: string;
  title: string;
  description: string;
  reason: string;
}

export interface RespondentInfo {
  name: string;
  role: string;
  color: string;
  icon?: string;
}
