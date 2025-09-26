import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { IntelligentUserRegistrationService } from './intelligent-user-registration.service';
import { GeminiService } from './gemini.service';
import { AIService } from './ai.service';
import { MessageService } from './message.service';
import { FluidRegistrationService } from './fluid-registration.service';
import Conversation from '../models/Conversation';

describe('IntelligentUserRegistrationService', () => {
  let service: IntelligentUserRegistrationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntelligentUserRegistrationService,
        {
          provide: GeminiService,
          useValue: {
            generateAIResponseWithFunctions: jest.fn(),
            generateAIResponse: jest.fn(),
          },
        },
        {
          provide: AIService,
          useValue: {
            getCurrentConfig: jest.fn(),
          },
        },
        {
          provide: MessageService,
          useValue: {
            getMessages: jest.fn(),
          },
        },
        {
          provide: FluidRegistrationService,
          useValue: {
            processFluidRegistration: jest.fn(),
          },
        },
        {
          provide: getModelToken('User'),
          useValue: {},
        },
        {
          provide: getModelToken('Conversation'),
          useValue: {
            findByIdAndUpdate: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<IntelligentUserRegistrationService>(
      IntelligentUserRegistrationService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have required methods', () => {
    expect(service.processUserMessage).toBeDefined();
    expect(service.checkIfNeedsLawyerIntervention).toBeDefined();
    expect(service.getConversationStats).toBeDefined();
  });
});
