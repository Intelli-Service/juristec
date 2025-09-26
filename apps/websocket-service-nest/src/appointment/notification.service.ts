import { Injectable } from '@nestjs/common';
import { IAppointment } from '../models/Appointment';

@Injectable()
export class NotificationService {
  /**
   * Envia email de notificação de agendamento
   */
  async sendAppointmentEmail(
    appointment: IAppointment, 
    type: 'created' | 'rescheduled' | 'cancelled' | 'reminder'
  ): Promise<void> {
    // TODO: Implementar integração com serviço de email (SendGrid, AWS SES, etc)
    console.log(`Email notification would be sent:`, {
      to: appointment.clientInfo.email,
      type,
      appointmentId: appointment._id,
      scheduledDateTime: appointment.scheduledDateTime
    });
  }

  /**
   * Envia SMS de notificação de agendamento
   */
  async sendAppointmentSMS(
    appointment: IAppointment, 
    type: 'created' | 'rescheduled' | 'cancelled' | 'reminder'
  ): Promise<void> {
    // TODO: Implementar integração com serviço de SMS (Twilio, AWS SNS, etc)
    console.log(`SMS notification would be sent:`, {
      to: appointment.clientInfo.phone,
      type,
      appointmentId: appointment._id,
      scheduledDateTime: appointment.scheduledDateTime
    });
  }
}