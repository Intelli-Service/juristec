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
  ) {
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
      );
      return {
        success: true,
        data: result,
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

  @Get('info')
  getUploadInfo() {
    return {
      service: 'file-upload',
      status: 'available',
      maxFileSize: '10MB',
      allowedTypes: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'],
      timestamp: new Date().toISOString(),
    };
  }
}
