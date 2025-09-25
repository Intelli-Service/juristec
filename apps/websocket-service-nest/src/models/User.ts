import { Schema, model, Document } from 'mongoose';

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  LAWYER = 'lawyer',
  MODERATOR = 'moderator',
  CLIENT = 'client'
}

export enum CaseStatus {
  OPEN = 'open',
  ACTIVE = 'active',           // Conversa em andamento
  RESOLVED_BY_AI = 'resolved_by_ai',     // Resolvida apenas por IA
  ASSIGNED = 'assigned',       // Mantém compatibilidade
  ASSIGNED_TO_LAWYER = 'assigned_to_lawyer', // Atribuída a advogado
  COMPLETED = 'completed',     // Finalizada com sucesso
  CLOSED = 'closed',           // Mantém compatibilidade
  ABANDONED = 'abandoned',     // Abandonada pelo usuário
  PENDING_REVIEW = 'pending_review'
}

export interface IUser extends Document {
  _id: string;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  permissions: string[];
  profile: {
    specialization?: string[];
    licenseNumber?: string;
    bio?: string;
  };
  assignedCases: string[]; // IDs dos casos atribuídos
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.CLIENT
  },
  isActive: {
    type: Boolean,
    default: true
  },
  permissions: [{
    type: String,
    enum: [
      'manage_ai_config',
      'view_all_cases',
      'assign_cases',
      'moderate_conversations',
      'access_client_chat',
      'generate_reports'
    ]
  }],
  profile: {
    specialization: [{ type: String }],
    licenseNumber: { type: String },
    bio: { type: String }
  },
  assignedCases: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Definir permissões padrão por role
UserSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('role')) {
    switch (this.role) {
      case UserRole.SUPER_ADMIN:
        this.permissions = [
          'manage_ai_config',
          'view_all_cases',
          'assign_cases',
          'moderate_conversations',
          'access_client_chat',
          'generate_reports'
        ];
        break;
      case UserRole.LAWYER:
        this.permissions = [
          'view_all_cases',
          'assign_cases',
          'access_client_chat'
        ];
        break;
      case UserRole.MODERATOR:
        this.permissions = [
          'view_all_cases',
          'moderate_conversations'
        ];
        break;
      case UserRole.CLIENT:
        this.permissions = [];
        break;
    }
  }
  next();
});

export default model<IUser>('User', UserSchema);