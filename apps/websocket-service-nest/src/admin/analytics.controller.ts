import {
  Controller,
  Get,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  AnalyticsService,
  AnalyticsFilters,
  AnalyticsMetrics,
  RevenueAnalyticsResponse,
  ConversationAnalyticsResponse,
  UserAnalyticsResponse,
} from '../lib/analytics.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  async getDashboardMetrics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('period') period?: 'day' | 'week' | 'month' | 'year',
    @Query('segment') segment?: 'all' | 'client' | 'lawyer' | 'admin',
  ): Promise<AnalyticsMetrics> {
    try {
      const filters: AnalyticsFilters = {};

      if (startDate) {
        filters.startDate = new Date(startDate);
      }

      if (endDate) {
        filters.endDate = new Date(endDate);
      }

      if (period) {
        filters.period = period;
      }

      if (segment && segment !== 'all') {
        filters.segment = segment;
      }

      return await this.analyticsService.getAnalytics(filters);
    } catch (_error) {
      throw new BadRequestException('Erro ao buscar métricas do dashboard');
    }
  }

  @Get('revenue')
  async getRevenueMetrics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('period') period?: 'day' | 'week' | 'month' | 'year',
  ): Promise<RevenueAnalyticsResponse> {
    try {
      const filters: AnalyticsFilters = {};

      if (startDate) {
        filters.startDate = new Date(startDate);
      }

      if (endDate) {
        filters.endDate = new Date(endDate);
      }

      if (period) {
        filters.period = period;
      }

      return await this.analyticsService.getRevenueAnalytics(filters);
    } catch (_error) {
      throw new BadRequestException('Erro ao buscar métricas de receita');
    }
  }

  @Get('conversations')
  async getConversationMetrics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('period') period?: 'day' | 'week' | 'month' | 'year',
  ): Promise<ConversationAnalyticsResponse> {
    try {
      const filters: AnalyticsFilters = {};

      if (startDate) {
        filters.startDate = new Date(startDate);
      }

      if (endDate) {
        filters.endDate = new Date(endDate);
      }

      if (period) {
        filters.period = period;
      }

      return await this.analyticsService.getConversationAnalytics(filters);
    } catch (_error) {
      throw new BadRequestException('Erro ao buscar métricas de conversas');
    }
  }

  @Get('users')
  async getUserMetrics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('period') period?: 'day' | 'week' | 'month' | 'year',
  ): Promise<UserAnalyticsResponse> {
    try {
      const filters: AnalyticsFilters = {};

      if (startDate) {
        filters.startDate = new Date(startDate);
      }

      if (endDate) {
        filters.endDate = new Date(endDate);
      }

      if (period) {
        filters.period = period;
      }

      return await this.analyticsService.getUserAnalytics(filters);
    } catch (_error) {
      throw new BadRequestException('Erro ao buscar métricas de usuários');
    }
  }

  @Get('export')
  async exportAnalytics(
    @Query('format') format: 'csv' | 'json' = 'json',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('period') period?: 'day' | 'week' | 'month' | 'year',
  ) {
    try {
      const filters: AnalyticsFilters = {};

      if (startDate) {
        filters.startDate = new Date(startDate);
      }

      if (endDate) {
        filters.endDate = new Date(endDate);
      }

      if (period) {
        filters.period = period;
      }

      return await this.analyticsService.exportAnalytics(format, filters);
    } catch (_error) {
      throw new BadRequestException('Erro ao exportar dados de analytics');
    }
  }
}
