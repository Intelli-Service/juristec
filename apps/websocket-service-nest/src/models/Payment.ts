import mongoose, { Schema, Document } from 'mongoose';

export enum PaymentStatus {
  PENDING = 'pending',
  AUTHORIZED = 'authorized',
  PAID = 'paid',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
}

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  PIX = 'pix',
  BOLETO = 'boleto',
}

export interface IPayment extends Document {
  _id: string;
  conversationId: string; // ID da conversa/caso
  clientId: string; // ID do cliente
  lawyerId: string; // ID do advogado
  amount: number; // Valor em centavos
  currency: string; // Moeda (BRL)
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  description: string;
  externalId?: string; // ID do Pagar.me
  transactionId?: string; // ID da transação no Pagar.me
  installments?: number; // Número de parcelas
  splitRules?: Array<{
    recipientId: string; // ID do recebedor no Pagar.me
    percentage: number; // Porcentagem do split
    amount: number; // Valor fixo em centavos (opcional)
    liable: boolean; // Responsável por chargebacks
    chargeProcessingFee: boolean; // Cobre taxa de processamento
  }>;
  metadata: {
    caseCategory?: string;
    caseComplexity?: string;
    lawyerSpecialization?: string;
    platformFee?: number; // Taxa da plataforma em centavos
  };
  paidAt?: Date;
  cancelledAt?: Date;
  refundedAt?: Date;
  refundAmount?: number;
  failureReason?: string;
  webhookData?: any; // Dados do webhook do Pagar.me
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    conversationId: {
      type: String,
      required: true,
      ref: 'Conversation',
    },
    clientId: {
      type: String,
      required: true,
      ref: 'User',
    },
    lawyerId: {
      type: String,
      required: true,
      ref: 'User',
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    currency: {
      type: String,
      default: 'BRL',
    },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethod),
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    externalId: { type: String },
    transactionId: { type: String },
    installments: {
      type: Number,
      min: 1,
      max: 12,
      default: 1,
    },
    splitRules: [
      {
        recipientId: { type: String, required: true },
        percentage: { type: Number, min: 0, max: 100 },
        amount: { type: Number, min: 0 },
        liable: { type: Boolean, default: false },
        chargeProcessingFee: { type: Boolean, default: false },
      },
    ],
    metadata: {
      caseCategory: { type: String },
      caseComplexity: { type: String },
      lawyerSpecialization: { type: String },
      platformFee: { type: Number, default: 0 },
    },
    paidAt: { type: Date },
    cancelledAt: { type: Date },
    refundedAt: { type: Date },
    refundAmount: { type: Number },
    failureReason: { type: String },
    webhookData: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
  },
);

// Índices para performance
PaymentSchema.index({ conversationId: 1 });
PaymentSchema.index({ clientId: 1 });
PaymentSchema.index({ lawyerId: 1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ externalId: 1 });
PaymentSchema.index({ createdAt: -1 });

export { PaymentSchema };
export default mongoose.models.Payment ||
  mongoose.model<IPayment>('Payment', PaymentSchema);
