import { Test, TestingModule } from '@nestjs/testing';
import { LawyerController } from './lawyer.controller';
import { AIService } from '../lib/ai.service';
import { MessageService } from '../lib/message.service';
import { NextAuthGuard } from '../guards/nextauth.guard';

describe('LawyerController', () => {
  let controller: LawyerController;

  const mockAIService = {
    getCasesForLawyer: jest.fn(),
    assignCase: jest.fn(),
  };

  const mockMessageService = {
    getMessages: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LawyerController],
      providers: [
        { provide: AIService, useValue: mockAIService },
        { provide: MessageService, useValue: mockMessageService },
      ],
    })
      .overrideGuard(NextAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<LawyerController>(LawyerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMyCases', () => {
    it('should return cases for lawyer', async () => {
      const mockCases = [
        { roomId: 'room1', status: 'open' },
        { roomId: 'room2', status: 'assigned' },
      ];

      mockAIService.getCasesForLawyer.mockResolvedValue(mockCases);

      const req = {
        user: {
          userId: 'lawyer1',
          role: 'lawyer',
          email: 'lawyer@test.com',
          name: 'Test Lawyer',
          permissions: ['view_available_cases', 'view_all_cases'],
        },
      };
      const result = await controller.getMyCases(req);

      expect(result).toEqual(mockCases);
      expect(mockAIService.getCasesForLawyer).toHaveBeenCalledWith('lawyer1');
    });
  });

  describe('assignCase', () => {
    it('should assign case to lawyer', async () => {
      mockAIService.assignCase.mockResolvedValue({ success: true });

      const req = {
        user: {
          userId: 'lawyer1',
          role: 'lawyer',
          email: 'lawyer@test.com',
          name: 'Test Lawyer',
          permissions: ['assign_cases_to_self', 'assign_cases'],
        },
      };
      const result = await controller.assignCase('room1', req);

      expect(result).toEqual({ success: true });
      expect(mockAIService.assignCase).toHaveBeenCalledWith('room1', 'lawyer1');
    });
  });
});
