import mongoose, { Schema, Document } from 'mongoose';

export enum ChargeStatus {
  PENDING = 'pending', // Cobrança criada, aguardando cliente aceitar
  ACCEPTED = 'accepted', // Cliente aceitou, aguardando pagamento
  PAID = 'paid', // Pagamento realizado com sucesso
  REJECTED = 'rejected', // Cliente recusou a cobrança
  CANCELLED = 'cancelled', // Advogado cancelou a cobrança
  EXPIRED = 'expired', // Cobrança expirou sem ação
}

export enum ChargeType {
  CONSULTATION = 'consultation', // Consulta jurídica
  DOCUMENT_ANALYSIS = 'document_analysis', // Análise de documentos
  LEGAL_OPINION = 'legal_opinion', // Parecer jurídico
  PROCESS_FOLLOWUP = 'process_followup', // Acompanhamento processual
  MEDIATION = 'mediation', // Mediação/negociação
  OTHER = 'other', // Outros serviços
}

export interface ICharge extends Document {
  _id: string;
  conversationId: string; // ID da conversa/caso
  lawyerId: string; // ID do advogado que criou a cobrança
  clientId: string; // ID do cliente
  amount: number; // Valor em centavos
  currency: string; // Moeda (BRL)
  status: ChargeStatus;
  type: ChargeType; // Tipo de serviço
  title: string; // Título da cobrança (ex: "Análise de Contrato")
  description: string; // Descrição detalhada do serviço
  reason: string; // Motivo/justificativa da cobrança

  // Metadados do caso
  metadata: {
    caseCategory?: string;
    caseComplexity?: string;
    estimatedHours?: number; // Tempo estimado em horas
    urgency?: 'low' | 'medium' | 'high' | 'urgent';
  };

  // Controle de validade
  expiresAt: Date; // Data de expiração da cobrança
  createdAt: Date;
  updatedAt: Date;
  acceptedAt?: Date; // Quando cliente aceitou
  rejectedAt?: Date; // Quando cliente rejeitou
  cancelledAt?: Date; // Quando advogado cancelou

  // Relacionamento com pagamento (quando processado)
  paymentId?: string; // ID do Payment quando pago

  // Configurações de split
  splitConfig: {
    lawyerPercentage: number; // % que vai para o advogado (ex: 95)
    platformPercentage: number; // % que vai para a plataforma (ex: 5)
    platformFee: number; // Valor fixo da taxa da plataforma
  };
}

const ChargeSchema = new Schema<ICharge>(
  {
    conversationId: {
      type: String,
      required: true,
      index: true,
    },
    lawyerId: {
      type: String,
      required: true,
      index: true,
    },
    clientId: {
      type: String,
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 100, // Mínimo R$ 1,00
    },
    currency: {
      type: String,
      default: 'BRL',
    },
    status: {
      type: String,
      enum: Object.values(ChargeStatus),
      default: ChargeStatus.PENDING,
    },
    type: {
      type: String,
      enum: Object.values(ChargeType),
      required: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      maxlength: 500,
    },
    reason: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    metadata: {
      caseCategory: String,
      caseComplexity: String,
      estimatedHours: Number,
      urgency: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
      },
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
      index: true,
    },
    acceptedAt: Date,
    rejectedAt: Date,
    cancelledAt: Date,
    paymentId: String,
    splitConfig: {
      lawyerPercentage: {
        type: Number,
        default: 95,
      },
      platformPercentage: {
        type: Number,
        default: 5,
      },
      platformFee: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
    collection: 'charges',
  },
);

// Índices para performance
ChargeSchema.index({ conversationId: 1, status: 1 });
ChargeSchema.index({ lawyerId: 1, createdAt: -1 });
ChargeSchema.index({ clientId: 1, createdAt: -1 });
ChargeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Middleware para atualizar updatedAt
ChargeSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model<ICharge>('Charge', ChargeSchema);
