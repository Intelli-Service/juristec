import mongoose, { Document, Schema } from 'mongoose';

// Tipos de agentes que podem enviar mensagens
export type MessageSender = 'user' | 'ai' | 'lawyer' | 'moderator' | 'system';

export interface IMessage extends Document {
  conversationId: Schema.Types.ObjectId;
  text: string;
  sender: MessageSender;
  senderId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
  },
  text: { type: String, required: true },
  sender: {
    type: String,
    enum: ['user', 'ai', 'lawyer', 'moderator', 'system'],
    required: true,
  },
  senderId: { type: String }, // ID do usuário/agente que enviou (opcional para system)
  metadata: {
    type: Schema.Types.Mixed, // Dados adicionais específicos do tipo de mensagem
    default: {},
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Índices para performance
MessageSchema.index({ conversationId: 1, createdAt: 1 });
MessageSchema.index({ sender: 1, createdAt: -1 });

export { MessageSchema };
export default mongoose.models.Message ||
  mongoose.model<IMessage>('Message', MessageSchema);
