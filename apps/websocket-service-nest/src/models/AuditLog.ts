import mongoose, { Schema, Document } from 'mongoose';

export enum AuditAction {
  // Autenticação
  LOGIN = 'login',
  LOGOUT = 'logout',
  PASSWORD_CHANGE = 'password_change',
  MFA_SETUP = 'mfa_setup',
  MFA_VERIFY = 'mfa_verify',

  // Dados do usuário
  USER_CREATE = 'user_create',
  USER_UPDATE = 'user_update',
  USER_DELETE = 'user_delete',
  USER_VIEW = 'user_view',

  // Conversas e mensagens
  CONVERSATION_CREATE = 'conversation_create',
  CONVERSATION_UPDATE = 'conversation_update',
  CONVERSATION_DELETE = 'conversation_delete',
  MESSAGE_SEND = 'message_send',
  MESSAGE_VIEW = 'message_view',

  // Arquivos
  FILE_UPLOAD = 'file_upload',
  FILE_DOWNLOAD = 'file_download',
  FILE_DELETE = 'file_delete',
  FILE_VIEW = 'file_view',

  // Pagamentos
  PAYMENT_CREATE = 'payment_create',
  PAYMENT_PROCESS = 'payment_process',
  PAYMENT_REFUND = 'payment_refund',

  // LGPD
  CONSENT_GRANT = 'consent_grant',
  CONSENT_REVOKE = 'consent_revoke',
  DATA_EXPORT = 'data_export',
  DATA_DELETE = 'data_delete',
  DATA_ACCESS = 'data_access',

  // Sistema
  CONFIG_UPDATE = 'config_update',
  BACKUP_CREATE = 'backup_create',
  BACKUP_RESTORE = 'backup_restore',
}

export enum AuditSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface IAuditLog extends Document {
  _id: string;
  userId?: string; // usuário que realizou a ação (se aplicável)
  action: AuditAction;
  severity: AuditSeverity;
  resource: string; // tipo de recurso afetado
  resourceId?: string; // ID do recurso afetado
  details: Record<string, any>; // detalhes específicos da ação
  ipAddress: string;
  userAgent: string;
  sessionId?: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };
  success: boolean;
  errorMessage?: string;
  timestamp: Date;
  expiresAt: Date; // para retenção automática (LGPD)
}

const AuditLogSchema = new Schema<IAuditLog>({
  userId: {
    type: String,
    sparse: true,
  },
  action: {
    type: String,
    enum: Object.values(AuditAction),
    required: true,
  },
  severity: {
    type: String,
    enum: Object.values(AuditSeverity),
    default: AuditSeverity.LOW,
  },
  resource: {
    type: String,
    required: true,
  },
  resourceId: {
    type: String,
    sparse: true,
  },
  details: {
    type: Schema.Types.Mixed,
    default: {},
  },
  ipAddress: {
    type: String,
    required: true,
  },
  userAgent: {
    type: String,
    required: true,
  },
  sessionId: {
    type: String,
    sparse: true,
  },
  location: {
    country: String,
    region: String,
    city: String,
  },
  success: {
    type: Boolean,
    default: true,
  },
  errorMessage: String,
  timestamp: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
});

// Índices para performance e compliance
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ resource: 1, resourceId: 1 });
AuditLogSchema.index({ severity: 1, timestamp: -1 });
AuditLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

export default mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
