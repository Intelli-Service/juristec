import mongoose from 'mongoose';

// Tipos de agentes que podem enviar mensagens
export type MessageSender = 'user' | 'ai' | 'lawyer' | 'moderator' | 'system';

const MessageSchema = new mongoose.Schema({
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
    type: mongoose.Schema.Types.Mixed, // Dados adicionais específicos do tipo de mensagem
    default: {},
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Índices para performance
MessageSchema.index({ conversationId: 1, createdAt: 1 });
MessageSchema.index({ sender: 1, createdAt: -1 });

export default mongoose.models.Message ||
  mongoose.model('Message', MessageSchema);
