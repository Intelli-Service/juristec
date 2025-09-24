import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { FileAttachment, FileAttachmentSchema } from '../models/FileAttachment';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FileAttachment.name, schema: FileAttachmentSchema },
    ]),
  ],
  controllers: [UploadsController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}