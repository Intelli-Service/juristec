import mongoose, { Document, Schema } from 'mongoose';

export enum AppointmentType {
  VIDEO = 'video',
  PHONE = 'phone',
  IN_PERSON = 'in_person'
}

export enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  NO_SHOW = 'no_show',
  RESCHEDULED = 'rescheduled'
}

export interface IAppointment extends Document {
  _id: string;
  conversationId: string; // Referência ao caso/conversa
  lawyerId: string; // ID do advogado
  clientId?: string; // ID do cliente (se registrado)
  clientInfo: {
    name: string;
    email: string;
    phone?: string;
  };
  
  // Detalhes do agendamento
  type: AppointmentType;
  status: AppointmentStatus;
  scheduledDateTime: Date;
  duration: number; // duração em minutos
  timeZone: string;
  
  // Informações de reunião
  meetingDetails?: {
    videoLink?: string; // Zoom/Meet link
    phoneNumber?: string;
    address?: string; // Para consultas presenciais
    meetingId?: string;
    password?: string;
  };
  
  // Integração Google Calendar
  googleCalendarEventId?: string;
  
  // Cancelamento/Reagendamento
  cancellationReason?: string;
  cancelledAt?: Date;
  cancelledBy?: string; // 'client' | 'lawyer' | 'system'
  rescheduleHistory?: Array<{
    originalDateTime: Date;
    newDateTime: Date;
    reason: string;
    rescheduledAt: Date;
    rescheduledBy: string;
  }>;
  
  // Notificações
  notifications: {
    emailSent: boolean;
    smsSent: boolean;
    reminderSent: boolean;
    confirmationSent: boolean;
  };
  
  // Notas e observações
  notes?: string;
  lawyerNotes?: string;
  
  // Política de cancelamento
  cancellationPolicy: {
    freeUntilHours: number; // horas antes para cancelamento gratuito
    cancellationFee?: number;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

const AppointmentSchema = new Schema<IAppointment>({
  conversationId: { 
    type: String, 
    required: true,
    ref: 'Conversation'
  },
  lawyerId: { 
    type: String, 
    required: true,
    ref: 'User'
  },
  clientId: { 
    type: String,
    ref: 'User'
  },
  clientInfo: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String }
  },
  
  type: {
    type: String,
    enum: Object.values(AppointmentType),
    required: true
  },
  status: {
    type: String,
    enum: Object.values(AppointmentStatus),
    default: AppointmentStatus.SCHEDULED
  },
  scheduledDateTime: { 
    type: Date, 
    required: true 
  },
  duration: { 
    type: Number, 
    required: true,
    default: 60 // 60 minutos por padrão
  },
  timeZone: { 
    type: String, 
    required: true,
    default: 'America/Sao_Paulo'
  },
  
  meetingDetails: {
    videoLink: { type: String },
    phoneNumber: { type: String },
    address: { type: String },
    meetingId: { type: String },
    password: { type: String }
  },
  
  googleCalendarEventId: { type: String },
  
  cancellationReason: { type: String },
  cancelledAt: { type: Date },
  cancelledBy: { type: String },
  rescheduleHistory: [{
    originalDateTime: { type: Date, required: true },
    newDateTime: { type: Date, required: true },
    reason: { type: String, required: true },
    rescheduledAt: { type: Date, default: Date.now },
    rescheduledBy: { type: String, required: true }
  }],
  
  notifications: {
    emailSent: { type: Boolean, default: false },
    smsSent: { type: Boolean, default: false },
    reminderSent: { type: Boolean, default: false },
    confirmationSent: { type: Boolean, default: false }
  },
  
  notes: { type: String },
  lawyerNotes: { type: String },
  
  cancellationPolicy: {
    freeUntilHours: { type: Number, default: 12 }, // 12h antes é gratuito
    cancellationFee: { type: Number, default: 0 }
  },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Índices para performance
AppointmentSchema.index({ lawyerId: 1, scheduledDateTime: 1 });
AppointmentSchema.index({ conversationId: 1 });
AppointmentSchema.index({ status: 1, scheduledDateTime: 1 });
AppointmentSchema.index({ scheduledDateTime: 1 }); // Para buscar conflitos
AppointmentSchema.index({ 'clientInfo.email': 1 });

// Middleware para atualizar updatedAt
AppointmentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export { AppointmentSchema };
export default mongoose.models.Appointment || mongoose.model<IAppointment>('Appointment', AppointmentSchema);