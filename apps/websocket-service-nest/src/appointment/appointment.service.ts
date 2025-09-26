import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IAppointment, AppointmentType, AppointmentStatus } from '../models/Appointment';

export interface CreateAppointmentDto {
  conversationId: string;
  lawyerId: string;
  clientId?: string;
  clientInfo: {
    name: string;
    email: string;
    phone?: string;
  };
  type: AppointmentType;
  scheduledDateTime: string; // ISO string
  duration?: number;
  timeZone?: string;
  notes?: string;
}

export interface LawyerAvailability {
  date: string; // YYYY-MM-DD
  timeSlots: Array<{
    startTime: string; // HH:MM
    endTime: string;
    available: boolean;
    duration: number;
  }>;
}

@Injectable()
export class AppointmentService {
  constructor(
    @InjectModel('Appointment') private appointmentModel: Model<IAppointment>
  ) {}

  /**
   * Cria um novo agendamento
   */
  async createAppointment(createDto: CreateAppointmentDto): Promise<IAppointment> {
    const scheduledDateTime = new Date(createDto.scheduledDateTime);
    
    // Validações básicas
    this.validateAppointmentTime(scheduledDateTime);
    
    // Verificar conflitos de horário
    await this.checkTimeConflicts(createDto.lawyerId, scheduledDateTime, createDto.duration || 60);
    
    // Criar objeto do agendamento
    const appointmentData: Partial<IAppointment> = {
      ...createDto,
      scheduledDateTime,
      duration: createDto.duration || 60,
      timeZone: createDto.timeZone || 'America/Sao_Paulo',
      status: AppointmentStatus.SCHEDULED,
      notifications: {
        emailSent: false,
        smsSent: false,
        reminderSent: false,
        confirmationSent: false
      },
      cancellationPolicy: {
        freeUntilHours: 12,
        cancellationFee: 0
      }
    };

    // Criar agendamento no banco
    const appointment = new this.appointmentModel(appointmentData);
    await appointment.save();

    return appointment;
  }

  /**
   * Busca disponibilidade do advogado
   */
  async getLawyerAvailability(lawyerId: string, date: string): Promise<LawyerAvailability> {
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    // Buscar agendamentos existentes no dia
    const existingAppointments = await this.appointmentModel.find({
      lawyerId,
      scheduledDateTime: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] }
    });

    // Gerar slots de horário (9h às 18h, intervalos de 1h)
    const timeSlots = [];
    for (let hour = 9; hour <= 17; hour++) {
      const startTime = `${hour.toString().padStart(2, '0')}:00`;
      const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;
      
      // Verificar se há conflito
      const slotStart = new Date(targetDate.setHours(hour, 0, 0, 0));
      const hasConflict = existingAppointments.some(apt => {
        const aptStart = new Date(apt.scheduledDateTime);
        const aptEnd = new Date(aptStart.getTime() + apt.duration * 60000);
        return slotStart >= aptStart && slotStart < aptEnd;
      });

      timeSlots.push({
        startTime,
        endTime,
        available: !hasConflict,
        duration: 60
      });
    }

    return {
      date,
      timeSlots
    };
  }

  /**
   * Busca agendamentos por advogado
   */
  async getAppointmentsByLawyer(
    lawyerId: string, 
    status?: AppointmentStatus,
    startDate?: Date,
    endDate?: Date
  ): Promise<IAppointment[]> {
    const query: any = { lawyerId };
    
    if (status) {
      query.status = status;
    }
    
    if (startDate || endDate) {
      query.scheduledDateTime = {};
      if (startDate) query.scheduledDateTime.$gte = startDate;
      if (endDate) query.scheduledDateTime.$lte = endDate;
    }

    return this.appointmentModel
      .find(query)
      .sort({ scheduledDateTime: 1 })
      .populate('conversationId')
      .exec();
  }

  /**
   * Busca agendamento por ID
   */
  async getAppointmentById(appointmentId: string): Promise<IAppointment> {
    const appointment = await this.appointmentModel
      .findById(appointmentId)
      .populate('conversationId')
      .exec();
      
    if (!appointment) {
      throw new NotFoundException('Agendamento não encontrado');
    }

    return appointment;
  }

  /**
   * Valida se o horário do agendamento é válido
   */
  private validateAppointmentTime(scheduledDateTime: Date): void {
    const now = new Date();
    const minAdvanceHours = 24;
    const minAdvanceTime = new Date(now.getTime() + minAdvanceHours * 60 * 60 * 1000);

    if (scheduledDateTime <= minAdvanceTime) {
      throw new BadRequestException(`Agendamento deve ser com pelo menos ${minAdvanceHours}h de antecedência`);
    }

    // Verificar se é em horário comercial (9h às 18h, seg-sex)
    const dayOfWeek = scheduledDateTime.getDay();
    const hour = scheduledDateTime.getHours();
    
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      throw new BadRequestException('Agendamentos apenas em dias úteis');
    }

    if (hour < 9 || hour >= 18) {
      throw new BadRequestException('Agendamentos disponíveis das 9h às 18h');
    }
  }

  /**
   * Lista todos os agendamentos com filtros
   */
  async getAllAppointments(
    filters: {
      status?: AppointmentStatus;
      type?: AppointmentType;
      startDate?: Date;
      endDate?: Date;
      lawyerId?: string;
      clientEmail?: string;
    } = {}
  ): Promise<IAppointment[]> {
    const query: any = {};

    if (filters.status) query.status = filters.status;
    if (filters.type) query.type = filters.type;
    if (filters.lawyerId) query.lawyerId = filters.lawyerId;
    if (filters.clientEmail) query['clientInfo.email'] = filters.clientEmail;

    if (filters.startDate || filters.endDate) {
      query.scheduledDateTime = {};
      if (filters.startDate) query.scheduledDateTime.$gte = filters.startDate;
      if (filters.endDate) query.scheduledDateTime.$lte = filters.endDate;
    }

    return this.appointmentModel
      .find(query)
      .sort({ scheduledDateTime: 1 })
      .populate('conversationId')
      .exec();
  }

  /**
   * Verifica conflitos de horário
   */
  private async checkTimeConflicts(
    lawyerId: string, 
    scheduledDateTime: Date, 
    duration: number,
    excludeAppointmentId?: string
  ): Promise<void> {
    const startTime = scheduledDateTime;
    const endTime = new Date(startTime.getTime() + duration * 60000);

    const query: any = {
      lawyerId,
      status: { $in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] },
      $or: [
        {
          // Novo agendamento começa durante um existente
          scheduledDateTime: { $lte: startTime },
          $expr: {
            $gte: [{
              $add: ['$scheduledDateTime', { $multiply: ['$duration', 60000] }]
            }, startTime]
          }
        },
        {
          // Novo agendamento termina durante um existente
          scheduledDateTime: { $lt: endTime, $gte: startTime }
        }
      ]
    };

    if (excludeAppointmentId) {
      query._id = { $ne: excludeAppointmentId };
    }

    const conflictingAppointment = await this.appointmentModel.findOne(query);
    
    if (conflictingAppointment) {
      throw new ConflictException('Horário já ocupado por outro agendamento');
    }
  }
}