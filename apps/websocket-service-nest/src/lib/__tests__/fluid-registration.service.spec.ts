import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { FluidRegistrationService } from '../fluid-registration.service';
import { VerificationService } from '../verification.service';
import { IUser } from '../../models/User';
import mongoose, { Model } from 'mongoose';
import { IConversation } from '../../models/Conversation';

describe('FluidRegistrationService', () => {
  let service: FluidRegistrationService;
  let verificationService: VerificationService;
  let userModel: Model<IUser>;
  let conversationModel: Model<IConversation>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FluidRegistrationService,
        {
          provide: VerificationService,
          useValue: {
            generateCode: jest.fn(),
            verifyCode: jest.fn(),
            isVerified: jest.fn(),
          },
        },
        {
          provide: getModelToken('User'),
          useValue: Object.assign(
            jest.fn().mockImplementation((userData) => {
              const userInstance = {
                _id: 'mock-user-id',
                email: userData.email || 'test@example.com',
                name: userData.name || 'Test User',
                ...userData,
              };
              userInstance.save = jest.fn().mockResolvedValue(userInstance);
              return userInstance;
            }),
            {
              findOne: jest.fn(),
              create: jest.fn(),
              findByIdAndUpdate: jest.fn(),
            },
          ),
        },
        {
          provide: getModelToken('Conversation'),
          useValue: {
            findByIdAndUpdate: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FluidRegistrationService>(FluidRegistrationService);
    verificationService = module.get<VerificationService>(VerificationService);
    userModel = module.get<Model<IUser>>(getModelToken('User'));
    conversationModel = module.get<Model<IConversation>>(
      getModelToken('Conversation'),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processFluidRegistration', () => {
    it('should create temporary user and send verification for new contact', async () => {
      jest.spyOn(userModel, 'findOne').mockResolvedValue(null);
      jest.spyOn(userModel, 'create').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        name: 'Test User',
        email: 'test@example.com',
        role: 'client',
      } as any);
      jest
        .spyOn(verificationService, 'generateCode')
        .mockResolvedValue('123456');
      jest
        .spyOn(conversationModel, 'findByIdAndUpdate')
        .mockResolvedValue({} as IConversation);

      const result = await service.processFluidRegistration(
        {
          name: 'João Silva',
          email: 'joao@email.com',
          phone: '+5511999999999',
        },
        new mongoose.Types.ObjectId().toString(),
      );

      expect(result.success).toBe(true);
      expect(result.userCreated).toBe(true);
      expect(result.verificationSent).toBe(true);
      expect(result.needsVerification).toBe(true);
    });

    it('should connect existing verified user automatically', async () => {
      const existingUser = {
        _id: new mongoose.Types.ObjectId(),
        name: 'João Silva',
        email: 'joao@email.com',
        isActive: true,
      } as any;

      jest.spyOn(userModel, 'findOne').mockResolvedValue(existingUser);
      jest.spyOn(verificationService, 'isVerified').mockResolvedValue(true);
      jest
        .spyOn(conversationModel, 'findByIdAndUpdate')
        .mockResolvedValue({} as IConversation);

      const result = await service.processFluidRegistration(
        {
          email: 'joao@email.com',
        },
        new mongoose.Types.ObjectId().toString(),
      );

      expect(result.success).toBe(true);
      expect(result.userId).toBe(existingUser._id.toString());
    }, 10000);

    it('should send verification for existing unverified user', async () => {
      const existingUser = {
        _id: new mongoose.Types.ObjectId(),
        name: 'João Silva',
        email: 'joao@email.com',
        isActive: true,
      } as any;

      jest.spyOn(userModel, 'findOne').mockResolvedValue(existingUser);
      jest.spyOn(verificationService, 'isVerified').mockResolvedValue(false);
      jest
        .spyOn(verificationService, 'generateCode')
        .mockResolvedValue('123456');

      const result = await service.processFluidRegistration(
        {
          email: 'joao@email.com',
        },
        new mongoose.Types.ObjectId().toString(),
      );

      expect(result.success).toBe(true);
      expect(result.verificationSent).toBe(true);
      expect(result.needsVerification).toBe(true);
    });
  });

  describe('verifyAndCompleteRegistration', () => {
    it('should complete registration with valid code', async () => {
      const user = {
        _id: new mongoose.Types.ObjectId(),
        name: 'João Silva',
        email: 'joao@email.com',
        isActive: false,
        save: jest.fn().mockResolvedValue(true),
      } as unknown as IUser;

      jest.spyOn(userModel, 'findOne').mockResolvedValue(user);
      jest.spyOn(verificationService, 'verifyCode').mockResolvedValue(true);
      jest
        .spyOn(conversationModel, 'findByIdAndUpdate')
        .mockResolvedValue({} as IConversation);

      const result = await service.verifyAndCompleteRegistration(
        { email: 'joao@email.com' },
        '123456',
        new mongoose.Types.ObjectId().toString(),
      );

      expect(result.success).toBe(true);
      expect(result.userId).toBe(user._id.toString());
      expect(user.save).toHaveBeenCalled();
    }, 10000);

    it('should fail with invalid code', async () => {
      jest.spyOn(verificationService, 'verifyCode').mockResolvedValue(false);

      const result = await service.verifyAndCompleteRegistration(
        { email: 'joao@email.com' },
        'wrong-code',
        new mongoose.Types.ObjectId().toString(),
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Código inválido');
    });
  });

  describe('generateConsistentRoomId', () => {
    it('should generate room ID based on email', () => {
      const roomId = service.generateConsistentRoomId({
        email: 'joao@email.com',
      });

      expect(roomId).toBe('user-joao@email.com');
    });

    it('should generate room ID based on phone', () => {
      const roomId = service.generateConsistentRoomId({
        phone: '+5511999999999',
      });

      expect(roomId).toBe('user-+5511999999999');
    });

    it('should return null when no contact info', () => {
      const roomId = service.generateConsistentRoomId({});

      expect(roomId).toBe(null);
    });
  });
});
