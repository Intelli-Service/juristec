import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('feedback')
@UseGuards(JwtAuthGuard)
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  create(@Body() createFeedbackDto: CreateFeedbackDto) {
    return this.feedbackService.create(createFeedbackDto);
  }

  @Put(':id')
  submitFeedback(
    @Param('id') id: string,
    @Body() updateFeedbackDto: UpdateFeedbackDto,
  ) {
    return this.feedbackService.submitFeedback(id, updateFeedbackDto);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.feedbackService.findById(id);
  }

  @Get('conversation/:conversationId')
  findByConversation(
    @Param('conversationId') conversationId: string,
    @Query('userId') userId: string,
  ) {
    return this.feedbackService.findByConversation(conversationId, userId);
  }

  @Get('user/pending')
  getPendingFeedbacks(@Query('userId') userId: string) {
    return this.feedbackService.getPendingFeedbacks(userId);
  }

  @Get('stats/overview')
  getFeedbackStats(
    @Query('lawyerId') lawyerId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.feedbackService.getFeedbackStats(lawyerId, start, end);
  }

  @Get('stats/trends')
  getFeedbackTrends(
    @Query('lawyerId') lawyerId?: string,
    @Query('days') days?: number,
  ) {
    return this.feedbackService.getFeedbackTrends(lawyerId, days);
  }
}