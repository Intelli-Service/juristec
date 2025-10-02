import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Storage } from '@google-cloud/storage';
import { GoogleGenAI } from '@google/genai';
import {
  FileAttachment,
  FileAttachmentDocument,
  ProcessedFileAttachment,
} from '../models/FileAttachment';

@Injectable()
export class UploadsService implements OnModuleInit {
  private storage: Storage;
  private bucket: string;
  private genAI: GoogleGenAI;

  // Constants for transaction timing
  private readonly TRANSACTION_COMMIT_DELAY_MS = 100; // Delay to ensure previous transaction is committed

  constructor(
    @InjectModel(FileAttachment.name)
    private fileAttachmentModel: Model<FileAttachmentDocument>,
  ) {
    this.bucket = process.env.GCS_BUCKET_NAME || 'juristec-uploads';

    // Initialize Google GenAI client
    const apiKey = process.env.GOOGLE_API_KEY;
    if (apiKey) {
      try {
        // Validate API key format (basic validation)
        if (!apiKey.startsWith('AIza') || apiKey.length < 20) {
          console.warn(
            '⚠️ GOOGLE_API_KEY format appears invalid, Gemini integration may not work',
          );
        }
        this.genAI = new GoogleGenAI({ apiKey });
        console.log('✅ GoogleGenAI client initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize GoogleGenAI client:', error);
        this.genAI = null as any;
      }
    } else {
      console.warn(
        '⚠️ GOOGLE_API_KEY not provided, Gemini file upload will be disabled',
      );
      this.genAI = null as any;
    }

    // Validate GCS credentials (skip in test environment)
    const isTestEnv =
      process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID;
    if (
      !isTestEnv &&
      (!process.env.GCS_PROJECT_ID ||
        !process.env.GCS_PRIVATE_KEY ||
        !process.env.GCS_CLIENT_EMAIL)
    ) {
      throw new Error(
        'GCS credentials not properly configured. Missing required environment variables: GCS_PROJECT_ID, GCS_PRIVATE_KEY, GCS_CLIENT_EMAIL',
      );
    }

    // Always initialize GCS client
    this.storage = new Storage({
      credentials: isTestEnv
        ? undefined
        : {
            type: 'service_account',
            project_id: process.env.GCS_PROJECT_ID,
            private_key: process.env.GCS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            client_email: process.env.GCS_CLIENT_EMAIL,
          },
      // Add timeout and retry configuration
      timeout: 30000,
      retryOptions: {
        retryDelayMultiplier: 2,
        totalTimeout: 60000,
        maxRetries: 3,
      },
    });
  }

  async onModuleInit() {
    // Skip GCS setup in test environment
    const isTestEnv =
      process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID;
    if (!isTestEnv) {
      // Always ensure GCS bucket exists
      await this.ensureBucketExists();
    }
  }

  private async ensureBucketExists(): Promise<void> {
    try {
      console.log(`🔍 Checking GCS bucket: ${this.bucket}`);
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

      // Test bucket access
      await bucket.getMetadata();
      console.log(`🔗 GCS bucket access verified: ${this.bucket}`);
    } catch (error) {
      console.error(`❌ GCS bucket setup failed:`, error);
      throw new Error(
        `Failed to setup GCS bucket ${this.bucket}: ${error.message}`,
      );
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    conversationId: string,
    userId: string,
    messageId?: string,
  ): Promise<FileAttachment> {
    // Validate file type and size
    this.validateFile(file);

    // Always use GCS for file uploads
    return this.uploadFileToGCS(file, conversationId, userId, messageId);
  }

  private async uploadFileToGCS(
    file: Express.Multer.File,
    conversationId: string,
    userId: string,
    messageId?: string,
  ): Promise<FileAttachment> {
    // Validate file buffer
    if (!file.buffer || file.buffer.length === 0) {
      throw new Error('File buffer is empty or invalid');
    }

    // Generate unique filename
    const fileExtension = file.originalname.split('.').pop();
    const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
    const gcsPath = `uploads/${conversationId}/${uniqueFilename}`;

    const bucket = this.storage.bucket(this.bucket);
    const blob = bucket.file(gcsPath);

    // Upload with timeout and retry logic
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `[UPLOAD] Attempt ${attempt}/${maxRetries} for file: ${uniqueFilename}`,
        );

        const uploadResult = await this.uploadWithTimeout(blob, file, gcsPath);

        // Upload file to Gemini API (don't block on failure)
        let geminiFileUri: string | null = null;
        try {
          geminiFileUri = await this.uploadFileToGemini(
            file,
            file.originalname,
          );
        } catch (geminiError) {
          console.warn(
            `⚠️ Gemini upload failed, but GCS upload succeeded: ${file.originalname}`,
            geminiError,
          );
        }

        // Save metadata to database after successful upload
        const fileAttachment = new this.fileAttachmentModel({
          filename: uniqueFilename, // Use unique filename for storage
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          url: uploadResult.url, // Use signed URL
          gcsPath,
          conversationId,
          userId,
          messageId: messageId || '', // Associate with message if provided
          textExtractionStatus: 'pending', // Mark for text extraction
          geminiFileUri,
          geminiUploadStatus: geminiFileUri ? 'completed' : 'failed',
        });

        console.log(`💾 SAVING FILE TO DB - BEFORE SAVE:`, {
          originalName: file.originalname,
          conversationId,
          userId,
          messageId,
          uniqueFilename,
          geminiFileUri: geminiFileUri ? 'PRESENT' : 'ABSENT',
        });

        const savedFile = await fileAttachment.save();

        console.log(`✅ FILE SAVED TO DB - AFTER SAVE:`, {
          savedId: savedFile._id,
          savedOriginalName: savedFile.originalName,
          savedConversationId: savedFile.conversationId,
          savedUserId: savedFile.userId,
          savedMessageId: savedFile.messageId,
          savedGeminiUri: savedFile.geminiFileUri ? 'PRESENT' : 'ABSENT',
        });

        // Log upload for audit trail
        console.log(
          `[AUDIT] File uploaded to GCS: ${uniqueFilename} (${file.size} bytes) by user ${userId}`,
        );

        return savedFile;
      } catch (error) {
        lastError = error as Error;
        console.error(
          `[UPLOAD ERROR] Attempt ${attempt}/${maxRetries} failed:`,
          {
            error: lastError.message,
            userId,
            conversationId,
            file: {
              originalname: file.originalname,
              mimetype: file.mimetype,
              size: file.size,
            },
          },
        );

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    throw new Error(
      `Upload failed after ${maxRetries} attempts: ${lastError?.message}`,
    );
  }

  private async uploadWithTimeout(
    blob: any,
    file: Express.Multer.File,
    gcsPath: string,
  ): Promise<FileAttachment> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Upload timeout after 30 seconds'));
      }, 30000); // 30 second timeout

      const stream = blob.createWriteStream({
        metadata: {
          contentType: file.mimetype,
        },
        resumable: false,
        timeout: 25000, // 25 second stream timeout
      });

      stream.on('error', (error: Error) => {
        clearTimeout(timeout);
        reject(error);
      });

      stream.on('finish', () => {
        clearTimeout(timeout);
        // Generate signed URL for secure access (expires in 1 hour)
        blob
          .getSignedUrl({
            version: 'v4',
            action: 'read',
            expires: Date.now() + 60 * 60 * 1000, // 1 hour
          })
          .then(async ([signedUrl]) => {
            // This method should not save to DB - let the caller handle it
            // Just return the upload result
            resolve({
              filename: file.originalname,
              originalName: file.originalname,
              mimeType: file.mimetype,
              size: file.size,
              url: signedUrl,
              gcsPath,
              conversationId: '', // Will be set by caller
              userId: '', // Will be set by caller
              messageId: '',
              textExtractionStatus: 'pending',
            } as FileAttachment);
          })
          .catch(reject);
      });

      // Write file buffer to stream
      stream.end(file.buffer);
    });
  }

  async getFilesByConversation(
    conversationId: string,
    userId?: string,
  ): Promise<FileAttachment[]> {
    console.log(`🔍 QUERY FILES BY CONVERSATION:`, {
      conversationId,
      userId,
      query: { conversationId, isDeleted: false },
    });

    // Verificar conexão do modelo
    console.log(`📊 MODEL CONNECTION STATUS:`, {
      modelName: this.fileAttachmentModel.modelName,
      db: this.fileAttachmentModel.db?.name,
      readyState: this.fileAttachmentModel.db?.readyState,
    });

    const files = await this.fileAttachmentModel
      .find({ conversationId, isDeleted: false })
      .sort({ createdAt: -1 });

    console.log(`📁 QUERY RESULT:`, {
      conversationId,
      filesFound: files.length,
      files: files.map((f) => ({
        id: f._id,
        originalName: f.originalName,
        messageId: f.messageId,
        userId: f.userId,
        conversationId: f.conversationId,
        isDeleted: f.isDeleted,
      })),
    });

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
    // Validate fileId is a valid ObjectId
    if (!Types.ObjectId.isValid(fileId)) {
      throw new Error('Invalid file ID format');
    }

    const file = await this.fileAttachmentModel.findOne({
      _id: new Types.ObjectId(fileId),
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
      { _id: new Types.ObjectId(fileId) },
      { isDeleted: true },
    );

    // Log deletion for audit trail
    console.log(
      `[AUDIT] File deleted: ${file.filename} by user ${userId} at ${new Date().toISOString()}`,
    );
  }

  // Generate signed URL valid for 10 minutes (for AI processing)
  async generateSignedUrlForAI(gcsPath: string): Promise<string> {
    try {
      const [signedUrl] = await this.storage
        .bucket(this.bucket)
        .file(gcsPath)
        .getSignedUrl({
          version: 'v4',
          action: 'read',
          expires: Date.now() + 10 * 60 * 1000, // 10 minutes
        });

      console.log(`🔗 Generated AI signed URL for ${gcsPath}: ${signedUrl}`);
      return signedUrl;
    } catch (error) {
      console.error(`❌ Error generating signed URL for AI: ${gcsPath}`, error);
      throw error;
    }
  }

  // Generate signed URL valid for 5 minutes (for user download)
  async generateDownloadSignedUrl(
    fileId: string,
    userId: string,
  ): Promise<string> {
    try {
      // Validate fileId is a valid ObjectId
      if (!Types.ObjectId.isValid(fileId)) {
        throw new Error('Invalid file ID format');
      }

      // Find the file and verify ownership
      const file = await this.fileAttachmentModel.findOne({
        _id: new Types.ObjectId(fileId),
        userId: userId,
      });

      if (!file) {
        throw new Error('File not found or access denied');
      }

      // Generate signed URL valid for 5 minutes
      const [signedUrl] = await this.storage
        .bucket(this.bucket)
        .file(file.gcsPath)
        .getSignedUrl({
          version: 'v4',
          action: 'read',
          expires: Date.now() + 5 * 60 * 1000, // 5 minutes
        });

      console.log(
        `🔗 Generated download signed URL for ${file.filename}: ${signedUrl}`,
      );
      return signedUrl;
    } catch (error) {
      console.error(
        `❌ Error generating download signed URL for file ${fileId}:`,
        error,
      );
      throw error;
    }
  }

  // Download file directly from GCS and return as stream
  async downloadFileDirectly(
    fileId: string,
    userId: string,
  ): Promise<{ stream: NodeJS.ReadableStream; file: any }> {
    try {
      // Validate fileId is a valid ObjectId
      if (!Types.ObjectId.isValid(fileId)) {
        throw new Error('Invalid file ID format');
      }

      // Find the file and verify ownership
      const file = await this.fileAttachmentModel.findOne({
        _id: new Types.ObjectId(fileId),
        userId: userId,
      });

      if (!file) {
        throw new Error('File not found or access denied');
      }

      // Get file from GCS
      const fileRef = this.storage.bucket(this.bucket).file(file.gcsPath);
      const stream = fileRef.createReadStream();

      console.log(`📥 Streaming file ${file.filename} for user ${userId}`);
      return { stream, file };
    } catch (error) {
      console.error(`❌ Error downloading file ${fileId}:`, error);
      throw error;
    }
  }

  // Upload file to Gemini API and return the file URI
  private async uploadFileToGemini(
    file: Express.Multer.File,
    displayName: string,
  ): Promise<string | null> {
    try {
      if (!this.genAI) {
        console.warn(
          '⚠️ GoogleGenAI client not initialized, skipping Gemini file upload',
        );
        return null;
      }

      console.log(
        `📤 Starting Gemini upload for file: ${displayName} (${file.size} bytes, ${file.mimetype})`,
      );

      // Convert buffer to Blob for the SDK (Node.js Buffer to Uint8Array for compatibility)
      const fileBlob = new Blob([new Uint8Array(file.buffer)], {
        type: file.mimetype,
      });

      // Use the official Google GenAI SDK following the documentation example
      const uploadedFile = await this.genAI.files.upload({
        file: fileBlob,
        config: {
          mimeType: file.mimetype,
          displayName: displayName,
        },
      });

      if (!uploadedFile.uri) {
        console.warn(
          `⚠️ Gemini upload succeeded but no URI returned for file: ${displayName}`,
        );
        return null;
      }

      console.log(
        `✅ File uploaded to Gemini successfully: ${JSON.stringify(uploadedFile, null, 2)}`,
      );

      return uploadedFile.uri;
    } catch (error) {
      console.error(`❌ Error uploading file to Gemini API: ${displayName}`, {
        message: error.message,
        stack: error.stack,
      });
      return null; // Don't throw, allow GCS upload to continue
    }
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

  // Get files with Gemini URIs for AI processing (returns Gemini URIs instead of signed URLs)
  async getFilesWithAISignedUrls(
    conversationId: string,
  ): Promise<ProcessedFileAttachment[]> {
    try {
      console.log(
        `🔍 Getting files with AI URIs for conversation: ${conversationId}`,
      );

      const files = await this.fileAttachmentModel
        .find({ conversationId, isDeleted: false })
        .sort({ createdAt: -1 });

      console.log(
        `📁 Found ${files.length} files for conversation ${conversationId}`,
      );

      // Process each file to include Gemini URI for AI processing
      const processedFiles = await Promise.all(
        files.map(async (file: FileAttachmentDocument) => {
          try {
            console.log(
              `🔗 Processing file: ${file.originalName} (${String(file._id)})`,
            );

            // Use Gemini URI if available, otherwise fallback to GCS signed URL
            let aiUri = file.geminiFileUri;

            if (!aiUri) {
              console.warn(
                `⚠️ No Gemini URI available for ${file.originalName}, generating GCS signed URL`,
              );
              // Fallback to GCS signed URL if Gemini upload failed
              aiUri = await this.generateSignedUrlForAI(file.gcsPath);
            }

            return this.createProcessedFileAttachment(file, aiUri);
          } catch (error) {
            console.error(
              `❌ Error processing file ${file.originalName}:`,
              error,
            );
            // Return file with basic info if processing fails
            return this.createProcessedFileAttachment(file, null);
          }
        }),
      );

      console.log(`✅ Processed ${processedFiles.length} files with AI URIs`);
      return processedFiles;
    } catch (error) {
      console.error(
        `❌ Error getting files with AI URIs for conversation ${conversationId}:`,
        error,
      );
      throw error;
    }
  }

  async getFilesByMessageId(
    messageId: string,
  ): Promise<ProcessedFileAttachment[]> {
    try {
      console.log(`🔍 Getting files for message: ${messageId}`);

      const files = await this.fileAttachmentModel
        .find({ messageId, isDeleted: false })
        .sort({ createdAt: 1 });

      console.log(`📁 Found ${files.length} files for message ${messageId}`);

      // Process each file to include Gemini URI for AI processing
      const processedFiles = await Promise.all(
        files.map(async (file: FileAttachmentDocument) => {
          try {
            console.log(
              `🔗 Processing file: ${file.originalName} (${String(file._id)})`,
            );

            // Use Gemini URI if available, otherwise fallback to GCS signed URL
            let aiUri = file.geminiFileUri;

            if (!aiUri) {
              console.warn(
                `⚠️ No Gemini URI available for ${file.originalName}, generating GCS signed URL`,
              );
              // Fallback to GCS signed URL if Gemini upload failed
              aiUri = await this.generateSignedUrlForAI(file.gcsPath);
            }

            return this.createProcessedFileAttachment(file, aiUri);
          } catch (error) {
            console.error(
              `❌ Error processing file ${file.originalName}:`,
              error,
            );
            // Return file with basic info if processing fails
            return this.createProcessedFileAttachment(file, null);
          }
        }),
      );

      console.log(
        `✅ Processed ${processedFiles.length} files with AI URIs for message ${messageId}`,
      );
      return processedFiles;
    } catch (error) {
      console.error(`❌ Error getting files for message ${messageId}:`, error);
      throw error;
    }
  }

  async reassignFileMessageId(
    originalName: string,
    conversationId: string,
    newMessageId: string,
  ): Promise<boolean> {
    try {
      console.log(`🔍 REASSIGN DEBUG - Procurando arquivo para reassociar:`, {
        originalName,
        conversationId,
        newMessageId,
        searchCriteria: {
          originalName,
          conversationId,
          messageId: { $regex: /^temp-/ },
          isDeleted: false,
        },
      });

      // Aguardar um pouco para garantir que a transação anterior foi commitada
      await new Promise((resolve) =>
        setTimeout(resolve, this.TRANSACTION_COMMIT_DELAY_MS),
      );

      // Primeiro, vamos listar todos os arquivos da conversa para debug
      const allFiles = await this.fileAttachmentModel.find({
        conversationId,
        isDeleted: false,
      });

      console.log(
        `📁 REASSIGN DEBUG - Todos os arquivos na conversa ${conversationId}:`,
        allFiles.map((f) => ({
          id: f._id,
          originalName: f.originalName,
          messageId: f.messageId,
          isTemp: f.messageId.startsWith('temp-'),
        })),
      );

      // Também buscar por originalName apenas
      const filesByName = await this.fileAttachmentModel.find({
        originalName,
        isDeleted: false,
      });

      console.log(
        `📁 REASSIGN DEBUG - Arquivos com mesmo originalName "${originalName}":`,
        filesByName.map((f) => ({
          id: f._id,
          conversationId: f.conversationId,
          messageId: f.messageId,
          isTemp: f.messageId.startsWith('temp-'),
        })),
      );

      const result = await this.fileAttachmentModel.updateOne(
        {
          originalName,
          conversationId,
          messageId: { $regex: /^temp-/ }, // Apenas arquivos temporários
          isDeleted: false,
        },
        { messageId: newMessageId },
      );

      console.log(`🔄 REASSIGN RESULT:`, {
        originalName,
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        acknowledged: result.acknowledged,
      });

      return result.modifiedCount > 0;
    } catch (error) {
      console.error(`❌ Error reassigning file ${originalName}:`, error);
      return false;
    }
  }

  // Helper method to create processed file attachment
  private createProcessedFileAttachment(
    file: FileAttachmentDocument,
    aiSignedUrl?: string | null,
  ): ProcessedFileAttachment {
    return {
      id: String(file._id), // Type-safe ID conversion
      ...file.toObject(),
      aiSignedUrl,
      mimeType: file.mimeType,
      originalName: file.originalName,
    } as ProcessedFileAttachment;
  }
}
