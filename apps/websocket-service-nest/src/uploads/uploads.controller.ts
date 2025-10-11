import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Body,
  BadRequestException,
  Request,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { UploadsService } from './uploads.service';

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('conversationId') conversationId: string,
    @Request() req: any,
    @Body('messageId') messageId?: string,
  ) {
    console.log(`📤 UPLOAD CONTROLLER DEBUG:`, {
      fileName: file?.originalname,
      conversationId,
      messageId,
      userId: req.user?.userId,
      hasMessageId: !!messageId,
      messageIdType: typeof messageId,
    });

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!conversationId) {
      throw new BadRequestException('conversationId is required');
    }

    const userId = req.user.userId; // Extract from JWT token

    try {
      const result = await this.uploadsService.uploadFile(
        file,
        conversationId,
        userId,
        messageId, // Optional messageId for file-message association
      );

      console.log(`✅ UPLOAD SUCCESS:`, {
        fileName: file.originalname,
        savedMessageId: result.messageId,
        resultKeys: Object.keys(result),
      });

      // Transform the result to ensure 'id' is always present as a string
      const response = {
        id: String((result as any)._id || (result as any).id),
        originalName: result.originalName,
        mimeType: result.mimeType,
        size: result.size,
        url: result.url,
        conversationId: result.conversationId,
        messageId: result.messageId,
      };

      console.log(`📦 TRANSFORMED UPLOAD RESPONSE:`, response);

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('[UPLOAD ERROR] Detailed error:', {
        message: error.message,
        stack: error.stack,
        userId,
        conversationId,
        file: file
          ? {
              originalname: file.originalname,
              mimetype: file.mimetype,
              size: file.size,
            }
          : null,
      });
      throw new BadRequestException(`Upload failed: ${error.message}`);
    }
  }

  @Get('conversation/:conversationId')
  async getFilesByConversation(
    @Param('conversationId') conversationId: string,
    @Request() req: any,
  ) {
    const userId = req.user.userId; // Extract from JWT token
    const files = await this.uploadsService.getFilesByConversation(
      conversationId,
      userId,
    );
    return {
      success: true,
      data: files,
    };
  }

  @Delete(':fileId')
  async deleteFile(@Param('fileId') fileId: string, @Request() req: any) {
    const userId = req.user.userId; // Extract from JWT token

    try {
      await this.uploadsService.deleteFile(fileId, userId);
      return {
        success: true,
        message: 'File deleted successfully',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('ai-files/:conversationId')
  async getFilesForAI(@Param('conversationId') conversationId: string) {
    const files =
      await this.uploadsService.getFilesWithAISignedUrls(conversationId);
    return {
      success: true,
      data: files,
    };
  }

  @Get('download/:fileId')
  async downloadFile(
    @Param('fileId') fileId: string,
    @Request() req: any,
    @Res() res: any,
  ) {
    const requestingUser = {
      userId: req.user.userId,
      role: req.user.role,
      permissions: req.user.permissions || [],
    };

    try {
      const { stream, file } = await this.uploadsService.downloadFileDirectly(
        fileId,
        requestingUser,
      );

      // Set appropriate headers
      res.setHeader('Content-Type', file.mimeType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${file.originalName}"`,
      );
      res.setHeader('Content-Length', file.size);

      // Pipe the stream directly to response
      stream.pipe(res);
    } catch (error) {
      console.error('Error downloading file:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  }
}
