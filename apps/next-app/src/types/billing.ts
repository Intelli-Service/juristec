export enum ChargeStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  PAID = 'paid',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

export enum ChargeType {
  CONSULTATION = 'consultation',
  DOCUMENT_ANALYSIS = 'document_analysis',
  LEGAL_OPINION = 'legal_opinion',
  PROCESS_FOLLOWUP = 'process_followup',
  MEDIATION = 'mediation',
  OTHER = 'other'
}

export interface Charge {
  _id: string;
  conversationId: string;
  lawyerId: string;
  clientId: string;
  amount: number;
  currency: string;
  status: ChargeStatus;
  type: ChargeType;
  title: string;
  description: string;
  reason: string;
  metadata?: {
    caseCategory?: string;
    caseComplexity?: string;
    estimatedHours?: number;
    urgency?: 'low' | 'medium' | 'high' | 'urgent';
  };
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  acceptedAt?: Date;
  rejectedAt?: Date;
  cancelledAt?: Date;
  paymentId?: string;
}

export interface BillingNotification {
  type: 'new_charge' | 'charge_accepted' | 'charge_rejected' | 'payment_completed';
  charge?: Charge;
  message: string;
  paymentUrl?: string;
}