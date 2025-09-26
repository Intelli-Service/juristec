import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Param, 
  Body, 
  Query, 
  UseGuards,
  HttpStatus,
  HttpCode
} from '@nestjs/common';
import { AppointmentService, CreateAppointmentDto } from './appointment.service';
import { NextAuthGuard } from '../guards/next-auth.guard';
import { AppointmentStatus, AppointmentType } from '../models/Appointment';

@Controller('appointments')
@UseGuards(NextAuthGuard)
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  /**
   * Cria novo agendamento
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createAppointment(@Body() createDto: CreateAppointmentDto) {
    const appointment = await this.appointmentService.createAppointment(createDto);
    return {
      success: true,
      data: appointment,
      message: 'Agendamento criado com sucesso'
    };
  }

  /**
   * Lista agendamentos do advogado logado
   */
  @Get('lawyer/:lawyerId')
  async getAppointmentsByLawyer(
    @Param('lawyerId') lawyerId: string,
    @Query('status') status?: AppointmentStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const appointments = await this.appointmentService.getAppointmentsByLawyer(
      lawyerId,
      status,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );

    return {
      success: true,
      data: appointments,
      count: appointments.length
    };
  }

  /**
   * Busca disponibilidade do advogado
   */
  @Get('availability/:lawyerId/:date')
  async getLawyerAvailability(
    @Param('lawyerId') lawyerId: string,
    @Param('date') date: string
  ) {
    const availability = await this.appointmentService.getLawyerAvailability(lawyerId, date);
    
    return {
      success: true,
      data: availability
    };
  }

  /**
   * Busca agendamento por ID
   */
  @Get(':id')
  async getAppointmentById(@Param('id') id: string) {
    const appointment = await this.appointmentService.getAppointmentById(id);
    
    return {
      success: true,
      data: appointment
    };
  }

  /**
   * Lista todos os agendamentos (para admins)
   */
  @Get()
  async getAllAppointments(
    @Query('status') status?: AppointmentStatus,
    @Query('type') type?: AppointmentType,
    @Query('lawyerId') lawyerId?: string,
    @Query('clientEmail') clientEmail?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const appointments = await this.appointmentService.getAllAppointments({
      status,
      type,
      lawyerId,
      clientEmail,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    });

    return {
      success: true,
      data: appointments,
      count: appointments.length
    };
  }
}