import mongoose from 'mongoose';
import { CaseStatus } from './User';

interface IConversation extends mongoose.Document {
  roomId: string;
  status: CaseStatus;
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

const ConversationSchema = new mongoose.Schema<IConversation>({
  roomId: { type: String, required: true, unique: true },
  status: {
    type: String,
    enum: Object.values(CaseStatus),
    default: CaseStatus.OPEN,
  },
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

// Índices para performance
ConversationSchema.index({ status: 1, assignedTo: 1 });
ConversationSchema.index({ 'classification.category': 1 });
ConversationSchema.index({ 'classification.complexity': 1 });
ConversationSchema.index({ priority: 1 });
ConversationSchema.index({ createdAt: -1 });

export { ConversationSchema };
export default mongoose.models.Conversation ||
  mongoose.model<IConversation>('Conversation', ConversationSchema);
