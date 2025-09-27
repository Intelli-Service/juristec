import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Feedback, FeedbackDocument, FeedbackStatus } from '../models/Feedback';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectModel(Feedback.name) private feedbackModel: Model<FeedbackDocument>,
  ) {}

  async create(createFeedbackDto: CreateFeedbackDto): Promise<Feedback> {
    // Validate that user hasn't already provided feedback for this conversation
    const existingFeedback = await this.feedbackModel.findOne({
      userId: createFeedbackDto.userId,
      conversationId: createFeedbackDto.conversationId,
      type: createFeedbackDto.type,
      status: FeedbackStatus.COMPLETED,
    });

    if (existingFeedback) {
      throw new BadRequestException(
        'Feedback already exists for this conversation',
      );
    }

    const feedback = new this.feedbackModel({
      ...createFeedbackDto,
      status: FeedbackStatus.PENDING,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    return feedback.save();
  }

  async submitFeedback(
    id: string,
    updateFeedbackDto: UpdateFeedbackDto,
  ): Promise<Feedback> {
    const feedback = await this.feedbackModel.findById(id);

    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }

    if (feedback.status === FeedbackStatus.COMPLETED) {
      throw new BadRequestException('Feedback already completed');
    }

    if (feedback.expiresAt && feedback.expiresAt < new Date()) {
      feedback.status = FeedbackStatus.EXPIRED;
      await feedback.save();
      throw new BadRequestException('Feedback has expired');
    }

    // Calculate NPS and CSAT scores
    const { responses } = updateFeedbackDto;
    let npsScore: number | undefined;
    let csatScore: number | undefined;

    if (responses?.recommendation) {
      // NPS: Promotores (9-10) - Detratores (0-6) / Total
      npsScore =
        responses.recommendation >= 9
          ? 100
          : responses.recommendation <= 6
            ? -100
            : 0;
    }

    if (responses?.satisfaction) {
      // CSAT: Convert 1-5 scale to 0-100
      csatScore = ((responses.satisfaction - 1) / 4) * 100;
    }

    const updatedFeedback = await this.feedbackModel.findByIdAndUpdate(
      id,
      {
        ...updateFeedbackDto,
        npsScore,
        csatScore,
        status: FeedbackStatus.COMPLETED,
        completedAt: new Date(),
      },
      { new: true },
    );

    if (!updatedFeedback) {
      throw new NotFoundException('Feedback not found');
    }

    return updatedFeedback;
  }

  async findById(id: string): Promise<Feedback> {
    const feedback = await this.feedbackModel.findById(id);
    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }
    return feedback;
  }

  async findByConversation(
    conversationId: string,
    userId: string,
  ): Promise<Feedback[]> {
    return this.feedbackModel
      .find({
        conversationId,
        userId,
      })
      .sort({ createdAt: -1 });
  }

  async getPendingFeedbacks(userId: string): Promise<Feedback[]> {
    return this.feedbackModel
      .find({
        userId,
        status: FeedbackStatus.PENDING,
        expiresAt: { $gt: new Date() },
      })
      .populate('conversationId', 'title')
      .sort({ createdAt: -1 });
  }

  async getFeedbackStats(lawyerId?: string, startDate?: Date, endDate?: Date) {
    const matchConditions: any = {};

    if (lawyerId) {
      matchConditions.lawyerId = lawyerId;
    }

    if (startDate || endDate) {
      matchConditions.createdAt = {};
      if (startDate) matchConditions.createdAt.$gte = startDate;
      if (endDate) matchConditions.createdAt.$lte = endDate;
    }

    const stats = await this.feedbackModel.aggregate([
      { $match: { ...matchConditions, status: FeedbackStatus.COMPLETED } },
      {
        $group: {
          _id: null,
          totalFeedbacks: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          averageNps: { $avg: '$npsScore' },
          averageCsat: { $avg: '$csatScore' },
          ratingDistribution: {
            $push: '$rating',
          },
          responseTimeAvg: { $avg: '$responses.responseTime' },
          professionalismAvg: { $avg: '$responses.professionalism' },
          understandingAvg: { $avg: '$responses.understanding' },
        },
      },
    ]);

    if (stats.length === 0) {
      return {
        totalFeedbacks: 0,
        averageRating: 0,
        averageNps: 0,
        averageCsat: 0,
        ratingDistribution: {},
        responseTimeAvg: 0,
        professionalismAvg: 0,
        understandingAvg: 0,
      };
    }

    const result = stats[0];

    // Calculate rating distribution
    const ratingDistribution = {};
    result.ratingDistribution.forEach((rating) => {
      ratingDistribution[rating] = (ratingDistribution[rating] || 0) + 1;
    });

    return {
      totalFeedbacks: result.totalFeedbacks,
      averageRating: Math.round(result.averageRating * 10) / 10,
      averageNps: Math.round(result.averageNps),
      averageCsat: Math.round(result.averageCsat),
      ratingDistribution,
      responseTimeAvg: Math.round(result.responseTimeAvg * 10) / 10,
      professionalismAvg: Math.round(result.professionalismAvg * 10) / 10,
      understandingAvg: Math.round(result.understandingAvg * 10) / 10,
    };
  }

  async getFeedbackTrends(lawyerId?: string, days: number = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const matchConditions: any = {
      status: FeedbackStatus.COMPLETED,
      createdAt: { $gte: startDate },
    };

    if (lawyerId) {
      matchConditions.lawyerId = lawyerId;
    }

    const trends = await this.feedbackModel.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          averageNps: { $avg: '$npsScore' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return trends.map((trend) => ({
      date: trend._id,
      count: trend.count,
      averageRating: Math.round(trend.averageRating * 10) / 10,
      averageNps: Math.round(trend.averageNps),
    }));
  }
}
