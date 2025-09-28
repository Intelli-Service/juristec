import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AIService } from '../lib/ai.service';
import { NextAuthGuard, JwtPayload } from '../guards/nextauth.guard';
import User, { UserRole } from '../models/User';
import Conversation from '../models/Conversation';

describe('AdminController', () => {
  let controller: AdminController;
  let aiService: jest.Mocked<AIService>;

  const mockUser: JwtPayload = {
    userId: 'admin-123',
    email: 'admin@example.com',
    role: 'super_admin',
    name: 'Admin User',
    permissions: [
      'manage_users',
      'manage_ai_config',
      'view_all_cases',
      'assign_cases',
    ],
  };

  const mockRequest = {
    user: mockUser,
  };

  beforeEach(async () => {
    const mockAIService = {
      getCurrentConfig: jest.fn(),
      updateConfig: jest.fn(),
      assignCase: jest.fn(),
    };

    // Mock do mongoose models
    const mockUserModel = {
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      save: jest.fn(),
    };

    const mockConversationModel = {
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      sort: jest.fn(),
    };

    // Mock das funções do mongoose
    (User.find as jest.Mock) = mockUserModel.find;
    (User.findById as jest.Mock) = mockUserModel.findById;
    (User.findByIdAndUpdate as jest.Mock) = mockUserModel.findByIdAndUpdate;
    (User.findByIdAndDelete as jest.Mock) = mockUserModel.findByIdAndDelete;
    (User as any).prototype.save = mockUserModel.save;

    (Conversation.find as jest.Mock) = mockConversationModel.find;
    (Conversation.findById as jest.Mock) = mockConversationModel.findById;
    (Conversation.findByIdAndUpdate as jest.Mock) =
      mockConversationModel.findByIdAndUpdate;
    (Conversation as any).prototype.sort = mockConversationModel.sort;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: AIService,
          useValue: mockAIService,
        },
      ],
    })
      .overrideGuard(NextAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminController>(AdminController);
    aiService = module.get(AIService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('AI Configuration', () => {
    describe('getAIConfig', () => {
      it('should return current AI configuration', async () => {
        const config = {
          temperature: 0.7,
          maxTokens: 1000,
          model: 'gemini-flash-lite-latest',
          systemPrompt: 'You are a legal assistant',
        };

        aiService.getCurrentConfig.mockResolvedValue(config as any);

        const result = await controller.getAIConfig();

        expect(aiService.getCurrentConfig).toHaveBeenCalled();
        expect(result).toEqual(config);
      });
    });

    describe('updateAIConfig', () => {
      it('should update AI configuration', async () => {
        const updates = {
          temperature: 0.8,
          maxTokens: 1500,
        };

        const updatedConfig = {
          temperature: 0.8,
          maxTokens: 1500,
          model: 'gemini-flash-lite-latest',
          systemPrompt: 'You are a legal assistant',
        };

        aiService.updateConfig.mockResolvedValue(updatedConfig as any);

        const result = await controller.updateAIConfig(updates, mockRequest);

        expect(aiService.updateConfig).toHaveBeenCalledWith(
          updates,
          mockUser.userId,
        );
        expect(result).toEqual(updatedConfig);
      });
    });
  });

  describe('User Management', () => {
    describe('getUsers', () => {
      it('should return all users without passwords', async () => {
        const users = [
          {
            _id: '1',
            name: 'User 1',
            email: 'user1@example.com',
            role: UserRole.CLIENT,
          },
          {
            _id: '2',
            name: 'User 2',
            email: 'user2@example.com',
            role: UserRole.LAWYER,
          },
        ];

        const mockQuery = {
          select: jest.fn().mockReturnThis(),
        };
        (User.find as jest.Mock).mockReturnValue(mockQuery);
        mockQuery.select.mockResolvedValue(users);

        const result = await controller.getUsers();

        expect(User.find).toHaveBeenCalled();
        expect(mockQuery.select).toHaveBeenCalledWith('-password');
        expect(result).toEqual(users);
      });
    });

    describe('createUser', () => {
      it('should create a new user', async () => {
        const userData = {
          name: 'New User',
          email: 'newuser@example.com',
          role: UserRole.CLIENT,
          password: 'hashedpassword',
        };

        const createdUser = {
          _id: 'user-123',
          ...userData,
        };

        // Mock the save method on the prototype
        const mockSave = jest.fn().mockResolvedValue(createdUser);
        User.prototype.save = mockSave;

        const result = await controller.createUser(userData, mockRequest);

        expect(mockSave).toHaveBeenCalled();
        expect(result).toEqual(createdUser);
      });
    });

    describe('updateUser', () => {
      it('should update a user', async () => {
        const userId = 'user-123';
        const updates = {
          name: 'Updated Name',
          role: UserRole.LAWYER,
        };

        const updatedUser = {
          _id: userId,
          name: 'Updated Name',
          email: 'user@example.com',
          role: UserRole.LAWYER,
        };

        const mockQuery = {
          select: jest.fn().mockReturnThis(),
        };
        (User.findByIdAndUpdate as jest.Mock).mockReturnValue(mockQuery);
        mockQuery.select.mockResolvedValue(updatedUser);

        const result = await controller.updateUser(
          userId,
          updates,
          mockRequest,
        );

        expect(User.findByIdAndUpdate).toHaveBeenCalledWith(userId, updates, {
          new: true,
        });
        expect(mockQuery.select).toHaveBeenCalledWith('-password');
        expect(result).toEqual(updatedUser);
      });
    });

    describe('deleteUser', () => {
      it('should delete a user', async () => {
        const userId = 'user-123';
        const deletedUser = {
          _id: userId,
          name: 'Deleted User',
          email: 'deleted@example.com',
        };

        (User.findByIdAndDelete as jest.Mock).mockResolvedValue(deletedUser);

        const result = await controller.deleteUser(userId, mockRequest);

        expect(User.findByIdAndDelete).toHaveBeenCalledWith(userId);
        expect(result).toEqual(deletedUser);
      });
    });
  });

  describe('Case Management', () => {
    describe('getCases', () => {
      it('should return all cases sorted by creation date', async () => {
        const cases = [
          {
            _id: '1',
            title: 'Case 1',
            status: 'active',
            createdAt: new Date(),
          },
          {
            _id: '2',
            title: 'Case 2',
            status: 'closed',
            createdAt: new Date(),
          },
        ];

        const mockQuery = {
          sort: jest.fn().mockResolvedValue(cases),
        };
        (Conversation.find as jest.Mock).mockReturnValue(mockQuery);

        const result = await controller.getCases();

        expect(Conversation.find).toHaveBeenCalled();
        expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
        expect(result).toEqual(cases);
      });
    });

    describe('getCase', () => {
      it('should return a specific case by id', async () => {
        const caseId = 'case-123';
        const caseData = {
          _id: caseId,
          title: 'Legal Case',
          status: 'active',
          messages: [],
        };

        (Conversation.findById as jest.Mock).mockResolvedValue(caseData);

        const result = await controller.getCase(caseId);

        expect(Conversation.findById).toHaveBeenCalledWith(caseId);
        expect(result).toEqual(caseData);
      });
    });

    describe('assignCase', () => {
      it('should assign a case to a lawyer', async () => {
        const caseId = 'case-123';
        const lawyerId = 'lawyer-456';
        const updatedCase = {
          _id: caseId,
          assignedTo: lawyerId,
          status: 'assigned',
        };

        (Conversation.findByIdAndUpdate as jest.Mock).mockResolvedValue(
          updatedCase as any,
        );

        const result = await controller.assignCase(caseId, { lawyerId });

        expect(Conversation.findByIdAndUpdate).toHaveBeenCalledWith(
          caseId,
          { assignedTo: lawyerId },
          { new: true },
        );
        expect(result).toEqual(updatedCase);
      });
    });
  });

  describe('Lawyer and Moderator Management', () => {
    describe('getLawyers', () => {
      it('should return all lawyers', async () => {
        const lawyers = [
          {
            _id: '1',
            name: 'Lawyer 1',
            email: 'lawyer1@example.com',
            role: UserRole.LAWYER,
          },
          {
            _id: '2',
            name: 'Lawyer 2',
            email: 'lawyer2@example.com',
            role: UserRole.LAWYER,
          },
        ];

        const mockQuery = {
          select: jest.fn().mockReturnThis(),
        };
        (User.find as jest.Mock).mockReturnValue(mockQuery);
        mockQuery.select.mockResolvedValue(lawyers);

        const result = await controller.getLawyers();

        expect(User.find).toHaveBeenCalledWith({ role: UserRole.LAWYER });
        expect(mockQuery.select).toHaveBeenCalledWith('-password');
        expect(result).toEqual(lawyers);
      });
    });

    describe('getModerators', () => {
      it('should return all moderators', async () => {
        const moderators = [
          {
            _id: '1',
            name: 'Moderator 1',
            email: 'mod1@example.com',
            role: UserRole.MODERATOR,
          },
          {
            _id: '2',
            name: 'Moderator 2',
            email: 'mod2@example.com',
            role: UserRole.MODERATOR,
          },
        ];

        const mockQuery = {
          select: jest.fn().mockReturnThis(),
        };
        (User.find as jest.Mock).mockReturnValue(mockQuery);
        mockQuery.select.mockResolvedValue(moderators);

        const result = await controller.getModerators();

        expect(User.find).toHaveBeenCalledWith({ role: UserRole.MODERATOR });
        expect(mockQuery.select).toHaveBeenCalledWith('-password');
        expect(result).toEqual(moderators);
      });
    });
  });
});
