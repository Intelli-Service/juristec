import { Test, TestingModule } from '@nestjs/testing';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { getModelToken } from '@nestjs/mongoose';
import { FileAttachment } from '../models/FileAttachment';

describe('UploadsController', () => {
  let controller: UploadsController;
  let mockUploadsService: any;

  beforeEach(async () => {
    mockUploadsService = {
      uploadFile: jest.fn(),
      getFilesByConversation: jest.fn(),
      deleteFile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadsController],
      providers: [
        {
          provide: UploadsService,
          useValue: mockUploadsService,
        },
        {
          provide: getModelToken(FileAttachment.name),
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<UploadsController>(UploadsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /uploads', () => {
    it('should upload file successfully', async () => {
      const mockFile = {
        mimetype: 'application/pdf',
        size: 1024,
        originalname: 'test.pdf',
      } as Express.Multer.File;

      const mockResult = {
        id: '1',
        filename: 'test.pdf',
        url: 'https://storage.googleapis.com/test.pdf',
      };

      mockUploadsService.uploadFile.mockResolvedValue(mockResult);

      const result = await controller.uploadFile(mockFile, 'conv-123', 'user-123');

      expect(result).toEqual({
        success: true,
        data: mockResult,
      });
      expect(mockUploadsService.uploadFile).toHaveBeenCalledWith(mockFile, 'conv-123', 'user-123');
    });

    it('should throw BadRequestException for missing file', async () => {
      await expect(controller.uploadFile(null as any, 'conv-123', 'user-123'))
        .rejects
        .toThrow('No file uploaded');
    });

    it('should throw BadRequestException for missing conversationId', async () => {
      const mockFile = { mimetype: 'application/pdf' } as Express.Multer.File;

      await expect(controller.uploadFile(mockFile, '', 'user-123'))
        .rejects
        .toThrow('conversationId and userId are required');
    });
  });

  describe('GET /uploads/conversation/:conversationId', () => {
    it('should return files for conversation', async () => {
      const mockFiles = [
        { id: '1', filename: 'test.pdf' },
        { id: '2', filename: 'test2.pdf' },
      ];

      mockUploadsService.getFilesByConversation.mockResolvedValue(mockFiles);

      const result = await controller.getFilesByConversation('conv-123');

      expect(result).toEqual({
        success: true,
        data: mockFiles,
      });
      expect(mockUploadsService.getFilesByConversation).toHaveBeenCalledWith('conv-123');
    });
  });
});