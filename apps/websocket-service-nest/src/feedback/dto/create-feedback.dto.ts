import { FeedbackType } from '../../models/Feedback';

export class CreateFeedbackDto {
  userId: string;
  lawyerId?: string;
  conversationId: string;
  type: FeedbackType;
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
    sessionDuration?: number;
    messageCount?: number;
    responseTime?: number;
  };
}