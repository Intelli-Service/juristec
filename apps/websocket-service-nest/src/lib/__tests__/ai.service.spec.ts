import { Test, TestingModule } from '@nestjs/testing';
import { AIService } from '../ai.service';
import AIConfig from '../../models/AIConfig';
import Conversation from '../../models/Conversation';

// Mock dos modelos
jest.mock('../../models/AIConfig');
jest.mock('../../models/Conversation');

const MockAIConfig = AIConfig as jest.MockedFunction<any>;
const MockConversation = Conversation as jest.MockedFunction<any>;

describe('AIService', () => {
  let service: AIService;

  beforeEach(async () => {
    // Resetar todos os mocks
    jest.clearAllMocks();

    // Configurar mocks dos modelos com chaining correto
    MockAIConfig.findOne = jest.fn().mockReturnValue({
      sort: jest.fn().mockResolvedValue(null),
    });
    MockAIConfig.create = jest.fn();
    MockAIConfig.findByIdAndUpdate = jest.fn();

    MockConversation.findOne = jest.fn();
    MockConversation.findByIdAndUpdate = jest.fn();
    MockConversation.findOneAndUpdate = jest.fn();
    MockConversation.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockResolvedValue([]),
    });

    // Mock do método loadConfig para evitar chamada no construtor
    const loadConfigSpy = jest.spyOn(AIService.prototype, 'loadConfig').mockResolvedValue();

    const module: TestingModule = await Test.createTestingModule({
      providers: [AIService],
    }).compile();

    service = module.get<AIService>(AIService);

    // Restaurar o spy após a instanciação
    loadConfigSpy.mockRestore();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('loadConfig', () => {
    it('should load existing config successfully', async () => {
      const mockConfig = {
        _id: 'config-id',
        systemPrompt: 'Test prompt',
        behaviorSettings: { maxTokens: 1000 },
        isActive: true,
        createdAt: new Date(),
      };

      const mockQuery = {
        sort: jest.fn().mockResolvedValue(mockConfig),
      };
      MockAIConfig.findOne.mockReturnValue(mockQuery);

      await service.loadConfig();

      expect(MockAIConfig.findOne).toHaveBeenCalledWith();
      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(service.getCurrentConfig()).toEqual(mockConfig);
    });

    it('should create default config when no config exists', async () => {
      const defaultConfig = {
        systemPrompt: expect.stringContaining('Você é um assistente jurídico brasileiro'),
        behaviorSettings: expect.objectContaining({
          maxTokens: 1000,
          temperature: 0.7,
        }),
        classificationSettings: expect.objectContaining({
          enabled: true,
          categories: expect.arrayContaining(['Consulta Geral']),
        }),
        updatedBy: 'system',
      };

      const mockQuery = {
        sort: jest.fn().mockResolvedValue(null),
      };
      MockAIConfig.findOne.mockReturnValue(mockQuery);
      MockAIConfig.create.mockResolvedValue(defaultConfig as any);

      await service.loadConfig();

      expect(MockAIConfig.findOne).toHaveBeenCalledWith();
      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(MockAIConfig.create).toHaveBeenCalledWith(defaultConfig);
      expect(service.getCurrentConfig()).toEqual(defaultConfig);
    });

    it('should handle database errors and use fallback config', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const mockQuery = {
        sort: jest.fn().mockRejectedValue(new Error('Database error')),
      };
      MockAIConfig.findOne.mockReturnValue(mockQuery);

      await service.loadConfig();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Erro ao carregar configuração da IA:',
        expect.any(Error)
      );

      const fallbackConfig = service.getCurrentConfig();
      expect(fallbackConfig).toBeDefined();
      expect(fallbackConfig.systemPrompt).toContain('Você é um assistente jurídico brasileiro');

      consoleSpy.mockRestore();
    });
  });

  describe('getCurrentConfig', () => {
    it('should return current config', () => {
      const mockConfig = { systemPrompt: 'Test config' };
      (service as any).currentConfig = mockConfig;

      const result = service.getCurrentConfig();

      expect(result).toEqual(mockConfig);
    });
  });

  describe('updateConfig', () => {
    beforeEach(() => {
      // Inicializar configuração para os testes
      (service as any).currentConfig = {
        _id: 'config-id',
        systemPrompt: 'Original prompt',
        behaviorSettings: { maxTokens: 1000 },
      };
    });

    it('should update config successfully', async () => {
      const updates = { systemPrompt: 'Updated prompt' };
      const updatedBy = 'admin';
      const updatedConfig = {
        _id: 'config-id',
        ...updates,
        updatedBy,
        updatedAt: expect.any(Date),
      };

      MockAIConfig.findByIdAndUpdate.mockResolvedValue(updatedConfig as any);

      const result = await service.updateConfig(updates, updatedBy);

      expect(MockAIConfig.findByIdAndUpdate).toHaveBeenCalledWith(
        'config-id',
        { ...updates, updatedBy, updatedAt: expect.any(Date) },
        { new: true }
      );
      expect(result).toEqual(updatedConfig);
      expect(service.getCurrentConfig()).toEqual(updatedConfig);
    });

    it('should throw error when update fails', async () => {
      const updates = { systemPrompt: 'Updated prompt' };
      const updatedBy = 'admin';
      const error = new Error('Update failed');

      MockAIConfig.findByIdAndUpdate.mockRejectedValue(error);

      await expect(service.updateConfig(updates, updatedBy)).rejects.toThrow('Update failed');
    });
  });

  describe('classifyConversation', () => {
    beforeEach(() => {
      (service as any).currentConfig = {
        classificationSettings: { enabled: true },
      };
    });

    it('should return null when classification is disabled', async () => {
      (service as any).currentConfig.classificationSettings.enabled = false;

      const result = await service.classifyConversation('room-123', []);

      expect(result).toBeNull();
    });

    it('should return null when conversation not found', async () => {
      MockConversation.findOne.mockResolvedValue(null);

      const result = await service.classifyConversation('room-123', []);

      expect(result).toBeNull();
    });

    it('should classify as judicial action for legal process keywords', async () => {
      const conversationData = {
        _id: 'conv-id',
        roomId: 'room-123',
        createdAt: new Date(),
      };

      MockConversation.findOne.mockResolvedValue(conversationData as any);
      MockConversation.findByIdAndUpdate.mockResolvedValue({} as any);

      const messages = [
        { text: 'Preciso entrar com um processo judicial urgente' },
        { text: 'O juiz determinou uma audiência' },
      ];

      const result = await service.classifyConversation('room-123', messages);

      expect(result).toEqual({
        category: 'Ação Judicial',
        complexity: 'complexo',
        legalArea: 'Direito Civil',
        summary: expect.stringContaining('Caso Ação Judicial - complexo'),
      });

      expect(MockConversation.findByIdAndUpdate).toHaveBeenCalledWith(
        'conv-id',
        expect.objectContaining({
          'classification.category': 'Ação Judicial',
          'classification.complexity': 'complexo',
          'classification.legalArea': 'Direito Civil',
        })
      );
    });

    it('should classify as labor law for employment keywords', async () => {
      const conversationData = {
        _id: 'conv-id',
        roomId: 'room-123',
        createdAt: new Date(),
      };

      MockConversation.findOne.mockResolvedValue(conversationData as any);
      MockConversation.findByIdAndUpdate.mockResolvedValue({} as any);

      const messages = [
        { text: 'Fui demitido sem justa causa' },
        { text: 'Quero saber sobre direitos trabalhistas' },
      ];

      const result = await service.classifyConversation('room-123', messages);

      expect(result).toEqual({
        category: 'Consulta Geral',
        complexity: 'medio',
        legalArea: 'Direito Trabalhista',
        summary: expect.stringContaining('Caso Consulta Geral - medio'),
      });
    });

    it('should classify as criminal law for crime keywords', async () => {
      const conversationData = {
        _id: 'conv-id',
        roomId: 'room-123',
        createdAt: new Date(),
      };

      MockConversation.findOne.mockResolvedValue(conversationData as any);
      MockConversation.findByIdAndUpdate.mockResolvedValue({} as any);

      const messages = [
        { text: 'Fui preso injustamente' },
        { text: 'A polícia me interrogou' },
      ];

      const result = await service.classifyConversation('room-123', messages);

      expect(result).toEqual({
        category: 'Consulta Geral',
        complexity: 'complexo',
        legalArea: 'Direito Penal',
        summary: expect.stringContaining('Caso Consulta Geral - complexo'),
      });
    });

    it('should handle classification errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      MockConversation.findOne.mockRejectedValue(new Error('Database error'));

      const result = await service.classifyConversation('room-123', []);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Erro ao classificar conversa:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('assignCase', () => {
    it('should assign case to lawyer successfully', async () => {
      const roomId = 'room-123';
      const lawyerId = 'lawyer-456';
      const updatedConversation = {
        _id: 'conv-id',
        roomId,
        assignedTo: lawyerId,
        assignedAt: expect.any(Date),
        status: 'assigned',
        updatedAt: expect.any(Date),
      };

      MockConversation.findOneAndUpdate.mockResolvedValue(updatedConversation as any);

      const result = await service.assignCase(roomId, lawyerId);

      expect(MockConversation.findOneAndUpdate).toHaveBeenCalledWith(
        { roomId },
        {
          assignedTo: lawyerId,
          assignedAt: expect.any(Date),
          status: 'assigned',
          updatedAt: expect.any(Date),
        },
        { new: true }
      );
      expect(result).toEqual(updatedConversation);
    });

    it('should throw error when assignment fails', async () => {
      const error = new Error('Assignment failed');
      MockConversation.findOneAndUpdate.mockRejectedValue(error);

      await expect(service.assignCase('room-123', 'lawyer-456')).rejects.toThrow('Assignment failed');
    });
  });

  describe('getCasesForLawyer', () => {
    it('should return cases assigned to lawyer and open cases', async () => {
      const lawyerId = 'lawyer-456';
      const mockCases = [
        { _id: 'case1', assignedTo: lawyerId },
        { _id: 'case2', status: 'open' },
      ];

      const mockQuery = {
        sort: jest.fn().mockResolvedValue(mockCases),
      };
      MockConversation.find.mockReturnValue(mockQuery);

      const result = await service.getCasesForLawyer(lawyerId);

      expect(MockConversation.find).toHaveBeenCalledWith({
        $or: [
          { assignedTo: lawyerId },
          { status: 'open' },
        ],
      });
      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual(mockCases);
    });

    it('should throw error when query fails', async () => {
      const error = new Error('Query failed');
      const mockQuery = {
        sort: jest.fn().mockRejectedValue(error),
      };
      MockConversation.find.mockReturnValue(mockQuery);

      await expect(service.getCasesForLawyer('lawyer-456')).rejects.toThrow('Query failed');
    });
  });

  describe('updateUserData', () => {
    it('should update user email', async () => {
      const conversationId = 'conv-123';
      const userData = { email: 'user@example.com' };

      MockConversation.findByIdAndUpdate.mockResolvedValue({} as any);

      await service.updateUserData(conversationId, userData);

      expect(MockConversation.findByIdAndUpdate).toHaveBeenCalledWith(
        conversationId,
        { userEmail: 'user@example.com' }
      );
    });

    it('should update user phone', async () => {
      const conversationId = 'conv-123';
      const userData = { phone: '+5511999999999' };

      MockConversation.findByIdAndUpdate.mockResolvedValue({} as any);

      await service.updateUserData(conversationId, userData);

      expect(MockConversation.findByIdAndUpdate).toHaveBeenCalledWith(
        conversationId,
        { userPhone: '+5511999999999' }
      );
    });

    it('should update user name', async () => {
      const conversationId = 'conv-123';
      const userData = { name: 'João Silva' };

      MockConversation.findByIdAndUpdate.mockResolvedValue({} as any);

      await service.updateUserData(conversationId, userData);

      expect(MockConversation.findByIdAndUpdate).toHaveBeenCalledWith(
        conversationId,
        { userName: 'João Silva' }
      );
    });

    it('should update multiple user data fields', async () => {
      const conversationId = 'conv-123';
      const userData = {
        name: 'João Silva',
        email: 'joao@example.com',
        phone: '+5511999999999',
      };

      MockConversation.findByIdAndUpdate.mockResolvedValue({} as any);

      await service.updateUserData(conversationId, userData);

      expect(MockConversation.findByIdAndUpdate).toHaveBeenCalledWith(
        conversationId,
        {
          userName: 'João Silva',
          userEmail: 'joao@example.com',
          userPhone: '+5511999999999',
        }
      );
    });

    it('should handle null values for email and phone', async () => {
      const conversationId = 'conv-123';
      const userData = { email: null, phone: null };

      MockConversation.findByIdAndUpdate.mockResolvedValue({} as any);

      await service.updateUserData(conversationId, userData);

      expect(MockConversation.findByIdAndUpdate).toHaveBeenCalledWith(
        conversationId,
        { userEmail: null, userPhone: null }
      );
    });

    it('should throw error when update fails', async () => {
      const error = new Error('Update failed');
      MockConversation.findByIdAndUpdate.mockRejectedValue(error);

      await expect(service.updateUserData('conv-123', { email: 'test@example.com' }))
        .rejects.toThrow('Update failed');
    });
  });
});