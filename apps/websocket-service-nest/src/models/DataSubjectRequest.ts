import mongoose, { Schema, Document } from 'mongoose';

export enum DataSubjectRight {
  ACCESS = 'access', // direito de acesso aos dados
  RECTIFICATION = 'rectification', // direito de retificação
  ERASURE = 'erasure', // direito ao esquecimento
  RESTRICTION = 'restriction', // direito à limitação
  PORTABILITY = 'portability', // direito à portabilidade
  OBJECTION = 'objection', // direito de oposição
}

export enum RequestStatus {
  PENDING = 'pending',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
}

export interface IDataSubjectRequest extends Document {
  _id: string;
  userId: string;
  right: DataSubjectRight;
  status: RequestStatus;
  description: string;
  justification?: string; // justificativa do usuário
  requestedData?: string[]; // tipos específicos de dados solicitados
  attachments?: string[]; // IDs de arquivos anexados (provas, documentos)

  // Processo de validação
  verificationToken: string; // token único para verificação
  verifiedAt?: Date;
  verifiedBy?: string; // ID do admin que verificou

  // Resposta
  response?: string;
  responseAttachments?: string[]; // IDs de arquivos de resposta
  respondedAt?: Date;
  respondedBy?: string; // ID do admin que respondeu

  // Metadados
  ipAddress: string;
  userAgent: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';

  // Controle de tempo (LGPD)
  expiresAt: Date; // prazo para resposta (30 dias)
  completedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const DataSubjectRequestSchema = new Schema<IDataSubjectRequest>(
  {
    userId: {
      type: String,
      required: true,
    },
    right: {
      type: String,
      enum: Object.values(DataSubjectRight),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(RequestStatus),
      default: RequestStatus.PENDING,
    },
    description: {
      type: String,
      required: true,
    },
    justification: String,
    requestedData: [String],
    attachments: [String],

    // Processo de validação
    verificationToken: {
      type: String,
      required: true,
    },
    verifiedAt: Date,
    verifiedBy: String,

    // Resposta
    response: String,
    responseAttachments: [String],
    respondedAt: Date,
    respondedBy: String,

    // Metadados
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      required: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },

    // Controle de tempo (LGPD - 30 dias para resposta)
    expiresAt: {
      type: Date,
      required: true,
    },
    completedAt: Date,
  },
  {
    timestamps: true,
  },
);

// Índices para performance
DataSubjectRequestSchema.index({ userId: 1, status: 1 });
DataSubjectRequestSchema.index({ status: 1, priority: -1, createdAt: 1 });
DataSubjectRequestSchema.index({ verificationToken: 1 }, { unique: true });
DataSubjectRequestSchema.index({ expiresAt: 1 });

export default mongoose.model<IDataSubjectRequest>(
  'DataSubjectRequest',
  DataSubjectRequestSchema,
);
