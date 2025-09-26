import mongoose, { Schema, Document } from 'mongoose';

export enum ConsentType {
  DATA_PROCESSING = 'data_processing',
  MARKETING = 'marketing',
  ANALYTICS = 'analytics',
  THIRD_PARTY_SHARING = 'third_party_sharing',
}

export enum ConsentStatus {
  PENDING = 'pending',
  GRANTED = 'granted',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
}

export interface IConsent extends Document {
  _id: string;
  userId: string;
  type: ConsentType;
  status: ConsentStatus;
  description: string;
  purpose: string;
  dataCategories: string[]; // tipos de dados coletados
  retentionPeriod: number; // período de retenção em dias
  legalBasis: string; // base legal (LGPD)
  version: string; // versão da política
  grantedAt?: Date;
  revokedAt?: Date;
  expiresAt?: Date;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  updatedAt: Date;
}

const ConsentSchema = new Schema<IConsent>({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: Object.values(ConsentType),
    required: true,
  },
  status: {
    type: String,
    enum: Object.values(ConsentStatus),
    default: ConsentStatus.PENDING,
  },
  description: {
    type: String,
    required: true,
  },
  purpose: {
    type: String,
    required: true,
  },
  dataCategories: [{
    type: String,
    required: true,
  }],
  retentionPeriod: {
    type: Number,
    required: true,
  },
  legalBasis: {
    type: String,
    required: true,
  },
  version: {
    type: String,
    required: true,
  },
  grantedAt: Date,
  revokedAt: Date,
  expiresAt: Date,
  ipAddress: {
    type: String,
    required: true,
  },
  userAgent: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

// Índices para performance
ConsentSchema.index({ userId: 1, type: 1 });
ConsentSchema.index({ status: 1, expiresAt: 1 });
ConsentSchema.index({ createdAt: -1 });

export default mongoose.model<IConsent>('Consent', ConsentSchema);