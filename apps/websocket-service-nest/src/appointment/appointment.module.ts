import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { AppointmentController } from './appointment.controller';
import { AppointmentService } from './appointment.service';
import { GoogleCalendarService } from './google-calendar.service';
import { NotificationService } from './notification.service';
import { VideoMeetingService } from './video-meeting.service';
import { AppointmentSchema } from '../models/Appointment';

@Module({
  imports: [
    JwtModule,
    MongooseModule.forFeature([
      { name: 'Appointment', schema: AppointmentSchema }
    ])
  ],
  controllers: [AppointmentController],
  providers: [
    AppointmentService,
    GoogleCalendarService,
    NotificationService,
    VideoMeetingService
  ],
  exports: [AppointmentService]
})
export class AppointmentModule {}