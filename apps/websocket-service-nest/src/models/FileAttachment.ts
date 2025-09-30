import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FileAttachmentDocument = FileAttachment & Document;

@Schema({ timestamps: true })
export class FileAttachment {
  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  originalName: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  size: number;

  @Prop({ required: true })
  url: string;

  @Prop({ required: true })
  gcsPath: string;

  @Prop({ required: true })
  conversationId: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  messageId: string; // ID da mensagem associada ao arquivo

  @Prop({ default: false })
  isDeleted: boolean;

  // Campos para processamento de conteúdo
  @Prop()
  extractedText?: string; // Texto extraído do arquivo (PDF, DOC, etc.)

  @Prop()
  textExtractionStatus?: 'pending' | 'processing' | 'completed' | 'failed';

  @Prop()
  textExtractionError?: string;
}

export const FileAttachmentSchema =
  SchemaFactory.createForClass(FileAttachment);
