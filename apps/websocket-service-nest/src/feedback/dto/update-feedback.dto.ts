export class UpdateFeedbackDto {
  rating?: number; // 1-5 stars

  responses?: {
    satisfaction?: number; // 1-5
    responseTime?: number; // 1-5
    professionalism?: number; // 1-5
    understanding?: number; // 1-5
    recommendation?: number; // 1-5 (NPS style)
  };

  comment?: string;

  metadata?: {
    userAgent?: string;
    ipAddress?: string;
    sessionDuration?: number;
    messageCount?: number;
    responseTime?: number;
  };
}
