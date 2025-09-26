import { Test, TestingModule } from '@nestjs/testing';
import { MongodbService } from '../mongodb.service';
import mongoose from 'mongoose';

// Mock do mongoose
jest.mock('mongoose', () => ({
  connect: jest.fn(),
}));

describe('MongodbService', () => {
  let service: MongodbService;
  let mockMongoose: jest.Mocked<typeof mongoose>;

  beforeEach(async () => {
    // Limpar cache global
    delete (global as any).mongoose;

    // Resetar mocks
    jest.clearAllMocks();

    mockMongoose = mongoose as jest.Mocked<typeof mongoose>;
    mockMongoose.connect.mockResolvedValue(mockMongoose);

    const module: TestingModule = await Test.createTestingModule({
      providers: [MongodbService],
    }).compile();

    service = module.get<MongodbService>(MongodbService);
  });

  afterEach(() => {
    // Limpar cache global após cada teste
    delete (global as any).mongoose;
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize cached property when global mongoose does not exist', () => {
      delete (global as any).mongoose;

      const newService = new MongodbService();

      expect((global as any).mongoose).toEqual({ conn: null, promise: null });
    });

    it('should use existing global mongoose cache', () => {
      const existingCache = { conn: 'existing', promise: 'existing' };
      (global as any).mongoose = existingCache;

      const newService = new MongodbService();

      expect((global as any).mongoose).toBe(existingCache);
    });
  });

  describe('connect', () => {
    beforeEach(() => {
      // Configurar variável de ambiente
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    });

    afterEach(() => {
      delete process.env.MONGODB_URI;
    });

    it('should throw error when MONGODB_URI is not defined', async () => {
      delete process.env.MONGODB_URI;

      await expect(service.connect()).rejects.toThrow(
        'Please define the MONGODB_URI environment variable inside .env.local'
      );
    });

    it('should return cached connection when already connected', async () => {
      // Configurar cache antes de criar o serviço
      (global as any).mongoose = { conn: mockMongoose, promise: null };

      const serviceWithCache = new MongodbService();
      const result = await serviceWithCache.connect();

      expect(result).toBe(mockMongoose);
      expect(mockMongoose.connect).not.toHaveBeenCalled();
    });

    it('should create new connection when no cached connection exists', async () => {
      const result = await service.connect();

      expect(mockMongoose.connect).toHaveBeenCalledWith('mongodb://localhost:27017/test', {
        bufferCommands: false,
      });
      expect(result).toBe(mockMongoose);
      expect((global as any).mongoose.conn).toBe(mockMongoose);
    });

    it('should reuse existing promise when connection is in progress', async () => {
      // Configurar cache com promise pendente
      (global as any).mongoose = { conn: null, promise: Promise.resolve(mockMongoose) };

      const serviceWithPromise = new MongodbService();
      const result = await serviceWithPromise.connect();

      expect(result).toBe(mockMongoose);
      expect(mockMongoose.connect).not.toHaveBeenCalled();
    });

    it('should handle connection errors gracefully', async () => {
      const connectionError = new Error('Connection failed');
      mockMongoose.connect.mockRejectedValue(connectionError);

      await expect(service.connect()).rejects.toThrow('Connection failed');
      expect((global as any).mongoose.promise).toBeDefined();
    });

    it('should cache successful connection', async () => {
      await service.connect();

      expect((global as any).mongoose.conn).toBe(mockMongoose);

      // Segunda chamada deve retornar cache
      mockMongoose.connect.mockClear();
      const result = await service.connect();

      expect(result).toBe(mockMongoose);
      expect(mockMongoose.connect).not.toHaveBeenCalled();
    });

    it('should use correct connection options', async () => {
      await service.connect();

      expect(mockMongoose.connect).toHaveBeenCalledWith(
        'mongodb://localhost:27017/test',
        expect.objectContaining({
          bufferCommands: false,
        })
      );
    });
  });
});