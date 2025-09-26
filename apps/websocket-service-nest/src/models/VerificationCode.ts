import mongoose, { Document } from 'mongoose';

export interface IVerificationCode extends Document {
  _id: string;
  email?: string;
  phone?: string;
  code: string;
  verified: boolean;
  expiresAt: Date;
  createdAt: Date;
  attempts: number;
  maxAttempts: number;
}

export const VerificationCodeSchema = new mongoose.Schema<IVerificationCode>({
  email: { type: String, sparse: true },
  phone: { type: String, sparse: true },
  code: { type: String, required: true },
  verified: { type: Boolean, default: false },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 3 }
});

// Índices
VerificationCodeSchema.index({ email: 1, verified: 1 });
VerificationCodeSchema.index({ phone: 1, verified: 1 });
VerificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });