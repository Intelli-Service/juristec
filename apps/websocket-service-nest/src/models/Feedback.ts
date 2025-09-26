import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FeedbackDocument = Feedback & Document;

export enum FeedbackType {
  POST_CHAT = 'post_chat',
  POST_CASE = 'post_case',
  PERIODIC_SURVEY = 'periodic_survey',
  SPONTANEOUS = 'spontaneous',
}

export enum FeedbackStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
}

@Schema({ timestamps: true })
export class Feedback {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  lawyerId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true })
  conversationId: Types.ObjectId;

  @Prop({ required: true, enum: FeedbackType })
  type: FeedbackType;

  @Prop({
    required: true,
    enum: FeedbackStatus,
    default: FeedbackStatus.PENDING,
  })
  status: FeedbackStatus;

  // Rating (1-5 stars)
  @Prop({ required: false, min: 1, max: 5 })
  rating?: number;

  // Structured feedback questions
  @Prop({ type: Object })
  responses?: {
    satisfaction?: number; // 1-5
    responseTime?: number; // 1-5
    professionalism?: number; // 1-5
    understanding?: number; // 1-5
    recommendation?: number; // 1-5 (NPS style)
  };

  // Open-ended comment
  @Prop({ required: false, maxlength: 1000 })
  comment?: string;

  // NPS Score (-100 to 100)
  @Prop({ required: false })
  npsScore?: number;

  // CSAT Score (0-100)
  @Prop({ required: false })
  csatScore?: number;

  // Metadata
  @Prop({ type: Object })
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
    sessionDuration?: number;
    messageCount?: number;
    responseTime?: number;
  };

  // Validation to prevent fake reviews
  @Prop({ required: false })
  validationToken?: string;

  @Prop({ required: false })
  expiresAt?: Date;

  @Prop({ required: false })
  completedAt?: Date;
}

export const FeedbackSchema = SchemaFactory.createForClass(Feedback);

// Indexes for performance
FeedbackSchema.index({ userId: 1, conversationId: 1 });
FeedbackSchema.index({ lawyerId: 1, status: 1 });
FeedbackSchema.index({ type: 1, status: 1 });
FeedbackSchema.index({ createdAt: -1 });
FeedbackSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
