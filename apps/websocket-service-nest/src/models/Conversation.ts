import mongoose, { Document, Schema } from 'mongoose';
import { CaseStatus } from './User';

export interface IConversation extends Document {
  roomId: string;
  userId: string; // UserId consistente gerado do token CSRF ou JWT
  isAuthenticated: boolean; // Se o usuário estava autenticado na criação
  user?: any; // Dados do usuário autenticado (se aplicável)
  status: CaseStatus;
  
  // 🚀 NOVOS CAMPOS: Múltiplas conversas por usuário
  title: string; // "Questão Trabalhista #1", "Divórcio Consensual #2", etc.
  isActive: boolean; // Conversa ativa (true) ou arquivada (false)
  lastMessageAt: Date; // Timestamp da última mensagem (para ordenação)
  unreadCount: number; // Contador de mensagens não lidas pelo cliente
  conversationNumber: number; // Número sequencial por usuário (#1, #2, #3...)
  
  classification: {
    category: string;
    complexity: 'simples' | 'medio' | 'complexo';
    legalArea: string;
    confidence: number;
  };
  summary: {
    text: string;
    lastUpdated: Date;
    generatedBy: 'ai' | 'manual';
  };
  assignedTo?: string; // User ID do advogado
  assignedAt?: Date;
  closedAt?: Date;
  closedBy?: string;
  resolution?: string;
  transferHistory?: Array<{
    from: string;
    to: string;
    reason: string;
    transferredAt: Date;
  }>;
  clientInfo: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
  };
  tags: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>({
  roomId: { type: String, required: true },
  userId: { type: String, required: true, index: true }, // Índice para busca rápida
  isAuthenticated: { type: Boolean, default: false },
  user: { type: Schema.Types.Mixed }, // Dados flexíveis do usuário autenticado
  status: {
    type: String,
    enum: Object.values(CaseStatus),
    default: CaseStatus.OPEN,
  },
  
  // 🚀 NOVOS CAMPOS: Múltiplas conversas por usuário
  title: { 
    type: String, 
    default: function() {
      return `Conversa #${Date.now().toString().slice(-6)}`;
    }
  },
  isActive: { type: Boolean, default: true },
  lastMessageAt: { type: Date, default: Date.now },
  unreadCount: { type: Number, default: 0, min: 0 },
  conversationNumber: { type: Number, required: true, min: 1 },
  classification: {
    category: { type: String, default: 'Não classificado' },
    complexity: {
      type: String,
      enum: ['simples', 'medio', 'complexo'],
      default: 'medio',
    },
    legalArea: { type: String, default: 'Geral' },
    confidence: { type: Number, default: 0, min: 0, max: 1 },
  },
  summary: {
    text: { type: String, default: '' },
    lastUpdated: { type: Date, default: Date.now },
    generatedBy: { type: String, enum: ['ai', 'manual'], default: 'ai' },
  },
  assignedTo: { type: String },
  assignedAt: { type: Date },
  closedAt: { type: Date },
  closedBy: { type: String },
  resolution: { type: String },
  transferHistory: [
    {
      from: { type: String, required: true },
      to: { type: String, required: true },
      reason: { type: String, required: true },
      transferredAt: { type: Date, default: Date.now },
    },
  ],
  clientInfo: {
    name: { type: String },
    email: { type: String },
    phone: { type: String },
    location: { type: String },
  },
  tags: [{ type: String }],
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Índices para performance - otimizados para múltiplas conversas
ConversationSchema.index({ status: 1, assignedTo: 1 });
ConversationSchema.index({ userId: 1, createdAt: -1 }); // Busca por userId + ordenação por data (legado)

// 🚀 NOVOS ÍNDICES: Múltiplas conversas por usuário
ConversationSchema.index({ userId: 1, isActive: 1, lastMessageAt: -1 }); // Lista conversas ativas ordenadas
ConversationSchema.index({ roomId: 1 }, { unique: true }); // roomId único no sistema
ConversationSchema.index({ userId: 1, conversationNumber: 1 }, { unique: true }); // Número único per usuário

ConversationSchema.index({ 'classification.category': 1 });
ConversationSchema.index({ 'classification.complexity': 1 });
ConversationSchema.index({ priority: 1 });
ConversationSchema.index({ createdAt: -1 });

export { ConversationSchema };
export default mongoose.models.Conversation ||
  mongoose.model<IConversation>('Conversation', ConversationSchema);
