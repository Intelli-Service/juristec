import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Storage } from '@google-cloud/storage';
import {
  FileAttachment,
  FileAttachmentDocument,
} from '../models/FileAttachment';

@Injectable()
export class UploadsService implements OnModuleInit {
  private storage: Storage;
  private bucket: string;

  constructor(
    @InjectModel(FileAttachment.name)
    private fileAttachmentModel: Model<FileAttachmentDocument>,
  ) {
    this.bucket = process.env.GCS_BUCKET_NAME || 'juristec-uploads';

    // Always initialize GCS client
    this.storage = new Storage({
      credentials: {
        type: 'service_account',
        project_id: process.env.GCS_PROJECT_ID,
        private_key: process.env.GCS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.GCS_CLIENT_EMAIL,
      },
    });
  }

  async onModuleInit() {
    // Always ensure GCS bucket exists
    await this.ensureBucketExists();
  }

  private async ensureBucketExists(): Promise<void> {
    try {
      const bucket = this.storage.bucket(this.bucket);
      const [exists] = await bucket.exists();

      if (!exists) {
        console.log(`📦 Creating GCS bucket: ${this.bucket}`);
        await bucket.create({
          location: 'US', // Default location
          storageClass: 'STANDARD',
        });
        console.log(`✅ GCS bucket created successfully: ${this.bucket}`);
      } else {
        console.log(`✅ GCS bucket already exists: ${this.bucket}`);
      }
    } catch (error) {
      console.error(`❌ Error ensuring bucket exists: ${error.message}`);
      // Don't throw - let the upload fail later with a clearer error
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    conversationId: string,
    userId: string,
  ): Promise<FileAttachment> {
    // Validate file type and size
    this.validateFile(file);

    // Always use GCS for file uploads
    return this.uploadFileToGCS(file, conversationId, userId);
  }

  private async uploadFileToGCS(
    file: Express.Multer.File,
    conversationId: string,
    userId: string,
  ): Promise<FileAttachment> {
    // Generate unique filename
    const fileExtension = file.originalname.split('.').pop();
    const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
    const gcsPath = `uploads/${conversationId}/${uniqueFilename}`;

    const bucket = this.storage.bucket(this.bucket);
    const blob = bucket.file(gcsPath);

    const stream = blob.createWriteStream({
      metadata: {
        contentType: file.mimetype,
      },
      resumable: false,
    });

    return new Promise((resolve, reject) => {
      stream.on('error', reject);

      stream.on('finish', () => {
        // Generate signed URL for secure access (expires in 1 hour)
        blob
          .getSignedUrl({
            version: 'v4',
            action: 'read',
            expires: Date.now() + 60 * 60 * 1000, // 1 hour
          })
          .then(async ([signedUrl]) => {
            // Save metadata to database
            const fileAttachment = new this.fileAttachmentModel({
              filename: uniqueFilename,
              originalName: file.originalname,
              mimeType: file.mimetype,
              size: file.size,
              url: signedUrl, // Use signed URL instead of public URL
              gcsPath,
              conversationId,
              userId,
            });

            const savedFile = await fileAttachment.save();

            // Log upload for audit trail
            console.log(
              `[AUDIT] File uploaded to GCS: ${uniqueFilename} by user ${userId} at ${new Date().toISOString()}`,
            );

            resolve(savedFile);
          })
          .catch(reject);
      });

      stream.end(file.buffer);
    });
  }

  async getFilesByConversation(
    conversationId: string,
    userId?: string,
  ): Promise<FileAttachment[]> {
    const files = await this.fileAttachmentModel
      .find({ conversationId, isDeleted: false })
      .sort({ createdAt: -1 });

    // Generate fresh URLs for all files
    for (const file of files) {
      // Always generate fresh signed URLs from GCS
      const [signedUrl] = await this.storage
        .bucket(this.bucket)
        .file(file.gcsPath)
        .getSignedUrl({
          version: 'v4',
          action: 'read',
          expires: Date.now() + 60 * 60 * 1000, // 1 hour
        });
      file.url = signedUrl;

      // Log access for audit trail
      console.log(
        `[AUDIT] File access: ${file.filename} by user ${userId || 'unknown'} at ${new Date().toISOString()}`,
      );
    }

    return files;
  }

  async getFileByFilename(filename: string): Promise<FileAttachment | null> {
    return this.fileAttachmentModel.findOne({ filename, isDeleted: false });
  }

  async deleteFile(fileId: string, userId: string): Promise<void> {
    const file = await this.fileAttachmentModel.findOne({
      _id: fileId,
      userId,
      isDeleted: false,
    });

    if (!file) {
      throw new Error('File not found or access denied');
    }

    // Always delete from GCS
    const bucket = this.storage.bucket(this.bucket);
    await bucket.file(file.gcsPath).delete();

    // Mark as deleted in database
    await this.fileAttachmentModel.updateOne(
      { _id: fileId },
      { isDeleted: true },
    );

    // Log deletion for audit trail
    console.log(
      `[AUDIT] File deleted: ${file.filename} by user ${userId} at ${new Date().toISOString()}`,
    );
  }

  private validateFile(file: Express.Multer.File): void {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
    ];

    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error(
        'Invalid file type. Only PDF, DOC, DOCX, JPG, PNG are allowed.',
      );
    }

    if (file.size > maxSize) {
      throw new Error('File size exceeds 10MB limit.');
    }
  }
}
