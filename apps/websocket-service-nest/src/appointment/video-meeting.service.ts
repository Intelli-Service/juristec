import { Injectable } from '@nestjs/common';

export interface CreateMeetingDto {
  topic: string;
  startTime: Date;
  duration: number;
}

export interface MeetingDetails {
  videoLink: string;
  meetingId: string;
  password?: string;  
}

@Injectable()
export class VideoMeetingService {
  /**
   * Cria reunião de vídeo
   * TODO: Implementar integração com Zoom/Google Meet
   */
  async createMeeting(meetingData: CreateMeetingDto): Promise<MeetingDetails> {
    // Por enquanto gera links fictícios
    // Em produção, integrar com Zoom API ou Google Meet
    const meetingId = `meeting_${Date.now()}`;
    
    return {
      videoLink: `https://meet.google.com/${meetingId}`,
      meetingId,
      password: Math.random().toString(36).substring(2, 8)
    };
  }
}