import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UploadsService } from './uploads.service';
import { FileAttachment } from '../models/FileAttachment';

describe('UploadsService', () => {
  let service: UploadsService;
  let mockFileAttachmentModel: any;

  beforeEach(async () => {
    mockFileAttachmentModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      updateOne: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadsService,
        {
          provide: getModelToken(FileAttachment.name),
          useValue: mockFileAttachmentModel,
        },
      ],
    }).compile();

    service = module.get<UploadsService>(UploadsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateFile', () => {
    it('should accept valid PDF file', () => {
      const validFile = {
        mimetype: 'application/pdf',
        size: 1024 * 1024, // 1MB
      } as Express.Multer.File;

      expect(() => (service as any).validateFile(validFile)).not.toThrow();
    });

    it('should reject invalid file type', () => {
      const invalidFile = {
        mimetype: 'text/plain',
        size: 1024,
      } as Express.Multer.File;

      expect(() => (service as any).validateFile(invalidFile)).toThrow(
        'Invalid file type. Only PDF, DOC, DOCX, JPG, PNG are allowed.',
      );
    });

    it('should reject file too large', () => {
      const largeFile = {
        mimetype: 'application/pdf',
        size: 15 * 1024 * 1024, // 15MB
      } as Express.Multer.File;

      expect(() => (service as any).validateFile(largeFile)).toThrow(
        'File size exceeds 10MB limit.',
      );
    });
  });

  describe('generateDownloadSignedUrl', () => {
    it('should throw error for invalid ObjectId', async () => {
      const invalidFileId = 'invalid-id';
      const userId = 'user123';

      await expect(service.generateDownloadSignedUrl(invalidFileId, userId)).rejects.toThrow('Invalid file ID format');
    });
  });
});
