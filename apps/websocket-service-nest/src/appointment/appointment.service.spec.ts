import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AppointmentService } from './appointment.service';
import { GoogleCalendarService } from './google-calendar.service';
import { NotificationService } from './notification.service';
import { VideoMeetingService } from './video-meeting.service';
import { AppointmentType, AppointmentStatus } from '../models/Appointment';
import { BadRequestException, ConflictException } from '@nestjs/common';

describe('AppointmentService', () => {
  let service: AppointmentService;
  let mockAppointmentModel: any;

  const mockAppointment = {
    _id: 'appointment123',
    conversationId: 'conv123',
    lawyerId: 'lawyer123',
    clientInfo: {
      name: 'João Silva',
      email: 'joao@test.com',
      phone: '11999999999'
    },
    type: AppointmentType.VIDEO,
    status: AppointmentStatus.SCHEDULED,
    scheduledDateTime: new Date('2024-10-15T14:00:00Z'),
    duration: 60,
    save: jest.fn().mockResolvedValue(true)
  };

  beforeEach(async () => {
    const mockModel = {
      find: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      constructor: jest.fn().mockImplementation(() => mockAppointment)
    };

    mockAppointmentModel = jest.fn().mockImplementation(() => mockAppointment);
    Object.assign(mockAppointmentModel, mockModel);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentService,
        {
          provide: getModelToken('Appointment'),
          useValue: mockAppointmentModel,
        },
        {
          provide: GoogleCalendarService,
          useValue: {
            createEvent: jest.fn().mockResolvedValue('event123'),
            updateEvent: jest.fn(),
            deleteEvent: jest.fn(),
          },
        },
        {
          provide: NotificationService,
          useValue: {
            sendAppointmentEmail: jest.fn(),
            sendAppointmentSMS: jest.fn(),
          },
        },
        {
          provide: VideoMeetingService,
          useValue: {
            createMeeting: jest.fn().mockResolvedValue({
              videoLink: 'https://meet.google.com/test',
              meetingId: 'meeting123',
              password: 'pass123'
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AppointmentService>(AppointmentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createAppointment', () => {
    const createDto = {
      conversationId: 'conv123',
      lawyerId: 'lawyer123',
      clientInfo: {
        name: 'João Silva',
        email: 'joao@test.com',
        phone: '11999999999'
      },
      type: AppointmentType.VIDEO,
      scheduledDateTime: '2024-10-15T14:00:00Z',
      duration: 60,
      notes: 'Consulta sobre direito trabalhista'
    };

    it('should create appointment successfully', async () => {
      // Mock para verificação de conflitos (nenhum conflito)
      mockAppointmentModel.findOne.mockResolvedValue(null);

      const result = await service.createAppointment(createDto);

      expect(result).toBeDefined();
      expect(mockAppointment.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException for appointment in the past', async () => {
      const pastDto = {
        ...createDto,
        scheduledDateTime: '2023-01-01T14:00:00Z' // Data no passado
      };

      await expect(service.createAppointment(pastDto))
        .rejects
        .toThrow(BadRequestException);
    });

    it('should throw BadRequestException for weekend appointment', async () => {
      const weekendDto = {
        ...createDto,
        scheduledDateTime: '2024-10-13T14:00:00Z' // Domingo
      };

      await expect(service.createAppointment(weekendDto))
        .rejects
        .toThrow(BadRequestException);
    });

    it('should throw BadRequestException for appointment outside business hours', async () => {
      const afterHoursDto = {
        ...createDto,
        scheduledDateTime: '2024-10-15T20:00:00Z' // 20h
      };

      await expect(service.createAppointment(afterHoursDto))
        .rejects
        .toThrow(BadRequestException);
    });

    it('should throw ConflictException for time conflict', async () => {
      // Mock para conflito de horário
      mockAppointmentModel.findOne.mockResolvedValue({ _id: 'conflict123' });

      await expect(service.createAppointment(createDto))
        .rejects
        .toThrow(ConflictException);
    });
  });

  describe('getLawyerAvailability', () => {
    it('should return availability for a date', async () => {
      // Mock para agendamentos existentes
      mockAppointmentModel.find.mockResolvedValue([
        {
          scheduledDateTime: new Date('2024-10-15T14:00:00Z'),
          duration: 60
        }
      ]);

      const result = await service.getLawyerAvailability('lawyer123', '2024-10-15');

      expect(result).toBeDefined();
      expect(result.date).toBe('2024-10-15');
      expect(result.timeSlots).toBeInstanceOf(Array);
      expect(result.timeSlots.length).toBeGreaterThan(0);

      // Verificar se 14h está ocupado
      const slot14h = result.timeSlots.find(slot => slot.startTime === '14:00');
      expect(slot14h?.available).toBe(false);
    });

    it('should show all slots as available when no appointments exist', async () => {
      mockAppointmentModel.find.mockResolvedValue([]);

      const result = await service.getLawyerAvailability('lawyer123', '2024-10-15');

      expect(result.timeSlots.every(slot => slot.available)).toBe(true);
    });
  });

  describe('getAppointmentsByLawyer', () => {
    it('should return appointments for lawyer', async () => {
      const mockExec = jest.fn().mockResolvedValue([mockAppointment]);
      const mockPopulate = jest.fn().mockReturnValue({ exec: mockExec });
      const mockSort = jest.fn().mockReturnValue({ populate: mockPopulate });
      mockAppointmentModel.find.mockReturnValue({ sort: mockSort });

      const result = await service.getAppointmentsByLawyer('lawyer123');

      expect(result).toEqual([mockAppointment]);
      expect(mockAppointmentModel.find).toHaveBeenCalledWith({ lawyerId: 'lawyer123' });
    });

    it('should filter appointments by status', async () => {
      const mockExec = jest.fn().mockResolvedValue([mockAppointment]);
      const mockPopulate = jest.fn().mockReturnValue({ exec: mockExec });
      const mockSort = jest.fn().mockReturnValue({ populate: mockPopulate });
      mockAppointmentModel.find.mockReturnValue({ sort: mockSort });

      const result = await service.getAppointmentsByLawyer('lawyer123', AppointmentStatus.SCHEDULED);

      expect(mockAppointmentModel.find).toHaveBeenCalledWith({
        lawyerId: 'lawyer123',
        status: AppointmentStatus.SCHEDULED
      });
    });
  });
});