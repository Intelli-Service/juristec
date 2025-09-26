import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ICharge, ChargeStatus } from '../models/Charge';
import { IUser, UserRole } from '../models/User';

export interface AnalyticsMetrics {
  // Métricas de Conversão
  conversion: {
    totalConversations: number;
    conversationsWithCharges: number;
    conversionRate: number;
    averageChargeValue: number;
  };

  // Métricas Financeiras
  financial: {
    totalRevenue: number;
    totalCharges: number;
    paidCharges: number;
    pendingCharges: number;
    rejectedCharges: number;
    averageRevenuePerConversation: number;
    monthlyRevenue: { month: string; revenue: number }[];
  };

  // Métricas de Usuários
  users: {
    totalUsers: number;
    activeLawyers: number;
    totalClients: number;
    newUsersThisMonth: number;
  };

  // Métricas de Performance
  performance: {
    averageResponseTime: number; // em minutos
    averageConversationDuration: number; // em minutos
    resolutionRate: number; // conversas fechadas / total
    satisfactionScore: number; // NPS médio (quando implementado)
  };

  // Métricas por Advogado
  lawyers: {
    topLawyers: {
      lawyerId: string;
      lawyerName: string;
      totalCharges: number;
      totalRevenue: number;
      conversionRate: number;
      averageRating: number;
    }[];
    lawyerStats: {
      [lawyerId: string]: {
        conversations: number;
        charges: number;
        revenue: number;
        responseTime: number;
      };
    };
  };

  // Métricas por Tipo de Serviço
  services: {
    chargesByType: { [key: string]: number };
    revenueByType: { [key: string]: number };
    averageValueByType: { [key: string]: number };
  };

  // Métricas de Sistema
  system: {
    totalMessages: number;
    messagesPerDay: { date: string; count: number }[];
    activeConversations: number;
    systemUptime: number; // percentual
  };
}

export interface AnalyticsFilters {
  startDate?: Date;
  endDate?: Date;
  period?: 'day' | 'week' | 'month' | 'year';
  segment?: 'client' | 'lawyer' | 'admin';
  lawyerId?: string;
  chargeStatus?: ChargeStatus;
  conversationStatus?: string;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel('Charge') private chargeModel: Model<ICharge>,
    @InjectModel('Conversation') private conversationModel: Model<any>,
    @InjectModel('Message') private messageModel: Model<any>,
    @InjectModel('User') private userModel: Model<IUser>,
  ) {}

  async getAnalytics(
    filters: AnalyticsFilters = {},
  ): Promise<AnalyticsMetrics> {
    const { startDate, endDate } = this.buildDateFilter(filters);

    // Executar todas as queries em paralelo para performance
    const [
      conversations,
      charges,
      messages,
      users,
      monthlyRevenue,
      messagesPerDay,
      lawyerStats,
      serviceStats,
    ] = await Promise.all([
      this.getConversationsData(startDate, endDate, filters),
      this.getChargesData(startDate, endDate, filters),
      this.getMessagesData(startDate, endDate),
      this.getUsersData(),
      this.getMonthlyRevenue(startDate, endDate),
      this.getMessagesPerDay(startDate, endDate),
      this.getLawyerStats(startDate, endDate),
      this.getServiceStats(startDate, endDate),
    ]);

    // Calcular métricas derivadas
    const conversionMetrics = this.calculateConversionMetrics(
      conversations,
      charges,
    );
    const financialMetrics = this.calculateFinancialMetrics(
      charges,
      monthlyRevenue,
    );
    const performanceMetrics = this.calculatePerformanceMetrics(conversations);
    const systemMetrics = this.calculateSystemMetrics(
      messages,
      messagesPerDay,
      conversations,
    );

    return {
      conversion: conversionMetrics,
      financial: financialMetrics,
      users: users,
      performance: performanceMetrics,
      lawyers: lawyerStats,
      services: serviceStats,
      system: systemMetrics,
    };
  }

  private buildDateFilter(filters: AnalyticsFilters) {
    const startDate =
      filters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 dias atrás
    const endDate = filters.endDate || new Date();

    return { startDate, endDate };
  }

  private async getConversationsData(
    startDate: Date,
    endDate: Date,
    filters: AnalyticsFilters,
  ) {
    const matchConditions: any = {
      createdAt: { $gte: startDate, $lte: endDate },
    };

    if (filters.conversationStatus) {
      matchConditions.status = filters.conversationStatus;
    }

    return await this.conversationModel.find(matchConditions).exec();
  }

  private async getChargesData(
    startDate: Date,
    endDate: Date,
    filters: AnalyticsFilters,
  ) {
    const matchConditions: any = {
      createdAt: { $gte: startDate, $lte: endDate },
    };

    if (filters.lawyerId) {
      matchConditions.lawyerId = filters.lawyerId;
    }

    if (filters.chargeStatus) {
      matchConditions.status = filters.chargeStatus;
    }

    return await this.chargeModel.find(matchConditions).exec();
  }

  private async getMessagesData(startDate: Date, endDate: Date) {
    return await this.messageModel
      .find({
        createdAt: { $gte: startDate, $lte: endDate },
      })
      .exec();
  }

  private async getUsersData() {
    const [totalUsers, lawyers, clients, newUsersThisMonth] = await Promise.all(
      [
        this.userModel.countDocuments({ isActive: true }),
        this.userModel.countDocuments({
          role: UserRole.LAWYER,
          isActive: true,
        }),
        this.userModel.countDocuments({
          role: UserRole.CLIENT,
          isActive: true,
        }),
        this.userModel.countDocuments({
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          isActive: true,
        }),
      ],
    );

    return {
      totalUsers,
      activeLawyers: lawyers,
      totalClients: clients,
      newUsersThisMonth,
    };
  }

  private async getMonthlyRevenue(startDate: Date, endDate: Date) {
    const monthlyData = await this.chargeModel.aggregate([
      {
        $match: {
          status: ChargeStatus.PAID,
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          revenue: { $sum: '$amount' },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 },
      },
    ]);

    return monthlyData.map((item) => ({
      month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
      revenue: item.revenue / 100, // converter centavos para reais
    }));
  }

  private async getMessagesPerDay(startDate: Date, endDate: Date) {
    const dailyData = await this.messageModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    return dailyData.map((item) => ({
      date: item._id,
      count: item.count,
    }));
  }

  private async getLawyerStats(startDate: Date, endDate: Date) {
    // Buscar advogados
    const lawyers = await this.userModel
      .find({ role: UserRole.LAWYER, isActive: true })
      .exec();

    // Estatísticas por advogado
    const lawyerStats: { [key: string]: any } = {};
    const topLawyers: any[] = [];

    for (const lawyer of lawyers) {
      const [conversations, charges, revenue] = await Promise.all([
        this.conversationModel.countDocuments({
          assignedTo: lawyer._id,
          createdAt: { $gte: startDate, $lte: endDate },
        }),
        this.chargeModel.countDocuments({
          lawyerId: lawyer._id,
          createdAt: { $gte: startDate, $lte: endDate },
        }),
        this.chargeModel.aggregate([
          {
            $match: {
              lawyerId: lawyer._id,
              status: ChargeStatus.PAID,
              createdAt: { $gte: startDate, $lte: endDate },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$amount' },
            },
          },
        ]),
      ]);

      const totalRevenue = revenue.length > 0 ? revenue[0].total / 100 : 0;
      const conversionRate =
        conversations > 0 ? (charges / conversations) * 100 : 0;

      lawyerStats[lawyer._id] = {
        conversations,
        charges,
        revenue: totalRevenue,
        responseTime: 0, // TODO: implementar cálculo de tempo de resposta
      };

      topLawyers.push({
        lawyerId: lawyer._id,
        lawyerName: lawyer.name,
        totalCharges: charges,
        totalRevenue,
        conversionRate,
        averageRating: 0, // TODO: implementar sistema de avaliações
      });
    }

    // Ordenar top advogados por receita
    topLawyers.sort((a, b) => b.totalRevenue - a.totalRevenue);

    return {
      topLawyers: topLawyers.slice(0, 10), // Top 10
      lawyerStats,
    };
  }

  private async getServiceStats(startDate: Date, endDate: Date) {
    const serviceData = await this.chargeModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalRevenue: {
            $sum: {
              $cond: [{ $eq: ['$status', ChargeStatus.PAID] }, '$amount', 0],
            },
          },
          totalValue: { $sum: '$amount' },
        },
      },
    ]);

    const chargesByType: { [key: string]: number } = {};
    const revenueByType: { [key: string]: number } = {};
    const averageValueByType: { [key: string]: number } = {};

    serviceData.forEach((item) => {
      chargesByType[item._id] = item.count;
      revenueByType[item._id] = item.totalRevenue / 100; // centavos para reais
      averageValueByType[item._id] = item.totalValue / item.count / 100; // média em reais
    });

    return {
      chargesByType,
      revenueByType,
      averageValueByType,
    };
  }

  private calculateConversionMetrics(conversations: any[], charges: any[]) {
    const totalConversations = conversations.length;
    const conversationsWithCharges = new Set(
      charges.map((c) => c.conversationId),
    ).size;
    const conversionRate =
      totalConversations > 0
        ? (conversationsWithCharges / totalConversations) * 100
        : 0;
    const averageChargeValue =
      charges.length > 0
        ? charges.reduce((sum, c) => sum + c.amount, 0) / charges.length / 100
        : 0;

    return {
      totalConversations,
      conversationsWithCharges,
      conversionRate,
      averageChargeValue,
    };
  }

  private calculateFinancialMetrics(charges: any[], monthlyRevenue: any[]) {
    const totalCharges = charges.length;
    const paidCharges = charges.filter(
      (c) => c.status === ChargeStatus.PAID,
    ).length;
    const pendingCharges = charges.filter(
      (c) => c.status === ChargeStatus.PENDING,
    ).length;
    const rejectedCharges = charges.filter(
      (c) => c.status === ChargeStatus.REJECTED,
    ).length;

    const totalRevenue =
      charges
        .filter((c) => c.status === ChargeStatus.PAID)
        .reduce((sum, c) => sum + c.amount, 0) / 100;

    const conversationsWithCharges = new Set(
      charges.map((c) => c.conversationId),
    ).size;
    const averageRevenuePerConversation =
      conversationsWithCharges > 0
        ? totalRevenue / conversationsWithCharges
        : 0;

    return {
      totalRevenue,
      totalCharges,
      paidCharges,
      pendingCharges,
      rejectedCharges,
      averageRevenuePerConversation,
      monthlyRevenue,
    };
  }

  private calculatePerformanceMetrics(conversations: any[]) {
    // TODO: Implementar cálculos reais de performance
    // Por enquanto, valores mockados
    const averageResponseTime = 15; // minutos
    const averageConversationDuration = 45; // minutos
    const closedConversations = conversations.filter(
      (c) => c.status === 'closed',
    ).length;
    const resolutionRate =
      conversations.length > 0
        ? (closedConversations / conversations.length) * 100
        : 0;
    const satisfactionScore = 85; // NPS médio (quando implementado)

    return {
      averageResponseTime,
      averageConversationDuration,
      resolutionRate,
      satisfactionScore,
    };
  }

  private calculateSystemMetrics(
    messages: any[],
    messagesPerDay: any[],
    conversations: any[],
  ) {
    const totalMessages = messages.length;
    const activeConversations = conversations.filter(
      (c) => c.status === 'open' || c.status === 'assigned',
    ).length;
    const systemUptime = 99.9; // TODO: implementar monitoramento real

    return {
      totalMessages,
      messagesPerDay,
      activeConversations,
      systemUptime,
    };
  }

  private convertToCSV(data: AnalyticsMetrics): string {
    // Implementar conversão para CSV
    // Por enquanto, retorna JSON stringificado
    return JSON.stringify(data, null, 2);
  }

  async getRevenueAnalytics(filters: AnalyticsFilters = {}) {
    const matchConditions = this.buildMatchConditions(filters);

    const revenueData = await this.chargeModel.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: {
            $dateToString: {
              format: this.getDateFormat(filters.period || 'month'),
              date: '$createdAt',
            },
          },
          totalRevenue: { $sum: '$amount' },
          totalCharges: { $sum: 1 },
          paidCharges: {
            $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] },
          },
          pendingCharges: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
          },
          rejectedCharges: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return {
      revenue: revenueData,
      summary: {
        totalRevenue: revenueData.reduce(
          (sum, item) => sum + item.totalRevenue,
          0,
        ),
        totalCharges: revenueData.reduce(
          (sum, item) => sum + item.totalCharges,
          0,
        ),
        paidCharges: revenueData.reduce(
          (sum, item) => sum + item.paidCharges,
          0,
        ),
        pendingCharges: revenueData.reduce(
          (sum, item) => sum + item.pendingCharges,
          0,
        ),
        rejectedCharges: revenueData.reduce(
          (sum, item) => sum + item.rejectedCharges,
          0,
        ),
      },
    };
  }

  async getConversationAnalytics(filters: AnalyticsFilters = {}) {
    const matchConditions = this.buildMatchConditions(filters);

    const conversationData = await this.conversationModel.aggregate([
      { $match: matchConditions },
      {
        $lookup: {
          from: 'messages',
          localField: '_id',
          foreignField: 'conversationId',
          as: 'messages',
        },
      },
      {
        $addFields: {
          messageCount: { $size: '$messages' },
          duration: {
            $divide: [
              { $subtract: ['$updatedAt', '$createdAt'] },
              1000 * 60, // em minutos
            ],
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: this.getDateFormat(filters.period || 'month'),
              date: '$createdAt',
            },
          },
          totalConversations: { $sum: 1 },
          resolvedConversations: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] },
          },
          averageMessages: { $avg: '$messageCount' },
          averageDuration: { $avg: '$duration' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return {
      conversations: conversationData,
      summary: {
        totalConversations: conversationData.reduce(
          (sum, item) => sum + item.totalConversations,
          0,
        ),
        resolvedConversations: conversationData.reduce(
          (sum, item) => sum + item.resolvedConversations,
          0,
        ),
        averageMessages:
          conversationData.reduce(
            (sum, item) => sum + item.averageMessages,
            0,
          ) / conversationData.length || 0,
        averageDuration:
          conversationData.reduce(
            (sum, item) => sum + item.averageDuration,
            0,
          ) / conversationData.length || 0,
      },
    };
  }

  async getUserAnalytics(filters: AnalyticsFilters = {}) {
    const matchConditions = this.buildMatchConditions(filters);

    const userData = await this.userModel.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: {
            $dateToString: {
              format: this.getDateFormat(filters.period || 'month'),
              date: '$createdAt',
            },
          },
          totalUsers: { $sum: 1 },
          lawyers: {
            $sum: { $cond: [{ $eq: ['$role', 'lawyer'] }, 1, 0] },
          },
          clients: {
            $sum: { $cond: [{ $eq: ['$role', 'client'] }, 1, 0] },
          },
          admins: {
            $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return {
      users: userData,
      summary: {
        totalUsers: userData.reduce((sum, item) => sum + item.totalUsers, 0),
        lawyers: userData.reduce((sum, item) => sum + item.lawyers, 0),
        clients: userData.reduce((sum, item) => sum + item.clients, 0),
        admins: userData.reduce((sum, item) => sum + item.admins, 0),
      },
    };
  }

  private buildMatchConditions(filters: AnalyticsFilters): any {
    const matchConditions: any = {};

    if (filters.startDate || filters.endDate) {
      matchConditions.createdAt = {};
      if (filters.startDate) {
        matchConditions.createdAt.$gte = filters.startDate;
      }
      if (filters.endDate) {
        matchConditions.createdAt.$lte = filters.endDate;
      }
    }

    if (filters.lawyerId) {
      matchConditions.lawyerId = filters.lawyerId;
    }

    if (filters.chargeStatus) {
      matchConditions.status = filters.chargeStatus;
    }

    if (filters.conversationStatus) {
      matchConditions.status = filters.conversationStatus;
    }

    if (filters.segment) {
      matchConditions.role = filters.segment;
    }

    return matchConditions;
  }

  private getDateFormat(period: 'day' | 'week' | 'month' | 'year'): string {
    switch (period) {
      case 'day':
        return '%Y-%m-%d';
      case 'week':
        return '%Y-%U';
      case 'month':
        return '%Y-%m';
      case 'year':
        return '%Y';
      default:
        return '%Y-%m';
    }
  }

  async exportAnalytics(
    format: 'csv' | 'json',
    filters: AnalyticsFilters = {},
  ) {
    const data = await this.getAnalytics(filters);

    if (format === 'csv') {
      return this.convertToCSV(data);
    }

    return data;
  }
}
