import mongoose, { Schema, Document } from 'mongoose';

export enum TransactionType {
  PAYMENT = 'payment',
  REFUND = 'refund',
  CHARGEBACK = 'chargeback',
  SPLIT = 'split',
}

export enum TransactionStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface IPaymentTransaction extends Document {
  _id: string;
  paymentId: string; // ID do pagamento relacionado
  externalId: string; // ID da transação no Pagar.me
  type: TransactionType;
  status: TransactionStatus;
  amount: number; // Valor em centavos
  fee: number; // Taxa em centavos
  netAmount: number; // Valor líquido em centavos
  description: string;
  metadata: {
    pagarmeTransactionId?: string;
    pagarmeStatus?: string;
    cardLastDigits?: string;
    cardBrand?: string;
    pixQrCode?: string;
    boletoUrl?: string;
    boletoBarcode?: string;
  };
  webhookEvents: Array<{
    event: string;
    data: any;
    receivedAt: Date;
  }>;
  processedAt?: Date;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentTransactionSchema = new Schema<IPaymentTransaction>(
  {
    paymentId: {
      type: String,
      required: true,
      ref: 'Payment',
    },
    externalId: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      enum: Object.values(TransactionType),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(TransactionStatus),
      default: TransactionStatus.PENDING,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    fee: {
      type: Number,
      default: 0,
      min: 0,
    },
    netAmount: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    metadata: {
      pagarmeTransactionId: { type: String },
      pagarmeStatus: { type: String },
      cardLastDigits: { type: String },
      cardBrand: { type: String },
      pixQrCode: { type: String },
      boletoUrl: { type: String },
      boletoBarcode: { type: String },
    },
    webhookEvents: [
      {
        event: { type: String, required: true },
        data: { type: Schema.Types.Mixed, required: true },
        receivedAt: { type: Date, default: Date.now },
      },
    ],
    processedAt: { type: Date },
    failureReason: { type: String },
  },
  {
    timestamps: true,
  },
);

// Índices para performance
PaymentTransactionSchema.index({ paymentId: 1 });
PaymentTransactionSchema.index({ status: 1 });
PaymentTransactionSchema.index({ type: 1 });
PaymentTransactionSchema.index({ createdAt: -1 });

export { PaymentTransactionSchema };
export default mongoose.models.PaymentTransaction ||
  mongoose.model<IPaymentTransaction>(
    'PaymentTransaction',
    PaymentTransactionSchema,
  );
