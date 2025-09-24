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
    @Body('userId') userId: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!conversationId || !userId) {
      throw new BadRequestException('conversationId and userId are required');
    }

    try {
      const result = await this.uploadsService.uploadFile(file, conversationId, userId);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('conversation/:conversationId')
  async getFilesByConversation(@Param('conversationId') conversationId: string) {
    const files = await this.uploadsService.getFilesByConversation(conversationId);
    return {
      success: true,
      data: files,
    };
  }

  @Delete(':fileId')
  async deleteFile(
    @Param('fileId') fileId: string,
    @Body('userId') userId: string,
  ) {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

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
}