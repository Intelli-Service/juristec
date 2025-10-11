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
        _id: '1',
        filename: 'test.pdf',
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        url: 'https://storage.googleapis.com/test.pdf',
        gcsPath: 'uploads/conv-123/test.pdf',
        conversationId: 'conv-123',
        userId: 'user-123',
        messageId: '',
        isDeleted: false,
        textExtractionStatus: 'pending',
        geminiUploadStatus: 'failed',
        id: '1',
      };

      const mockReq = {
        user: { userId: 'user-123' },
      };

      mockUploadsService.uploadFile.mockResolvedValue(mockResult);

      const result = await controller.uploadFile(
        mockFile,
        'conv-123',
        mockReq,
        undefined,
      );

      expect(result).toEqual({
        success: true,
        data: {
          id: '1',
          originalName: 'test.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          url: 'https://storage.googleapis.com/test.pdf',
          conversationId: 'conv-123',
          messageId: '',
        },
      });
      expect(mockUploadsService.uploadFile).toHaveBeenCalledWith(
        mockFile,
        'conv-123',
        'user-123',
        undefined, // messageId is optional
      );
    });

    it('should throw BadRequestException for missing file', async () => {
      const mockReq = {
        user: { userId: 'user-123' },
      };

      await expect(
        controller.uploadFile(null as any, 'conv-123', mockReq, undefined),
      ).rejects.toThrow('No file uploaded');
    });

    it('should throw BadRequestException for missing conversationId', async () => {
      const mockFile = { mimetype: 'application/pdf' } as Express.Multer.File;
      const mockReq = {
        user: { userId: 'user-123' },
      };

      await expect(
        controller.uploadFile(mockFile, '', mockReq, undefined),
      ).rejects.toThrow('conversationId is required');
    });
  });

  describe('GET /uploads/conversation/:conversationId', () => {
    it('should return files for conversation', async () => {
      const mockFiles = [
        { id: '1', filename: 'test.pdf' },
        { id: '2', filename: 'test2.pdf' },
      ];

      const mockReq = {
        user: { userId: 'user-123' },
      };

      mockUploadsService.getFilesByConversation.mockResolvedValue(mockFiles);

      const result = await controller.getFilesByConversation(
        'conv-123',
        mockReq,
      );

      expect(result).toEqual({
        success: true,
        data: mockFiles,
      });
      expect(mockUploadsService.getFilesByConversation).toHaveBeenCalledWith(
        'conv-123',
        'user-123',
      );
    });
  });

  describe('DELETE /uploads/:fileId', () => {
    it('should delete file successfully', async () => {
      const mockReq = {
        user: { userId: 'user-123' },
      };

      mockUploadsService.deleteFile.mockResolvedValue(undefined);

      const result = await controller.deleteFile('file-123', mockReq);

      expect(result).toEqual({
        success: true,
        message: 'File deleted successfully',
      });
      expect(mockUploadsService.deleteFile).toHaveBeenCalledWith(
        'file-123',
        'user-123',
      );
    });
  });
});
