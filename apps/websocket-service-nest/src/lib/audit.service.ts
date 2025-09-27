import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { IAuditLog, AuditAction, AuditSeverity } from '../models/AuditLog';

@Injectable()
export class AuditService {
  constructor(
    @InjectModel('AuditLog') private auditLogModel: Model<IAuditLog>,
  ) {}

  /**
   * Registra uma ação de auditoria
   */
  async log(
    action: AuditAction,
    resource: string,
    details: Record<string, any> = {},
    options: {
      userId?: string;
      resourceId?: string;
      severity?: AuditSeverity;
      ipAddress?: string;
      userAgent?: string;
      sessionId?: string;
      success?: boolean;
      errorMessage?: string;
    } = {},
  ): Promise<void> {
    try {
      const auditLog = new this.auditLogModel({
        userId: options.userId,
        action,
        severity: options.severity || AuditSeverity.LOW,
        resource,
        resourceId: options.resourceId,
        details,
        ipAddress: options.ipAddress || 'unknown',
        userAgent: options.userAgent || 'unknown',
        sessionId: options.sessionId,
        success: options.success !== false,
        errorMessage: options.errorMessage,
        timestamp: new Date(),
        expiresAt: this.calculateExpirationDate(), // 7 anos para LGPD
      });

      await auditLog.save();
    } catch (error) {
      // Em caso de erro no logging, não devemos quebrar a aplicação
      console.error('Erro ao registrar log de auditoria:', error);
    }
  }

  /**
   * Calcula data de expiração baseada na LGPD (7 anos)
   */
  private calculateExpirationDate(): Date {
    const expirationDate = new Date();
    expirationDate.setFullYear(expirationDate.getFullYear() + 7);
    return expirationDate;
  }

  /**
   * Busca logs de auditoria com filtros
   */
  async getAuditLogs(
    filters: {
      userId?: string;
      action?: AuditAction;
      resource?: string;
      resourceId?: string;
      severity?: AuditSeverity;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<IAuditLog[]> {
    const query: FilterQuery<IAuditLog> = {};

    if (filters.userId) query.userId = filters.userId;
    if (filters.action) query.action = filters.action;
    if (filters.resource) query.resource = filters.resource;
    if (filters.resourceId) query.resourceId = filters.resourceId;
    if (filters.severity) query.severity = filters.severity;

    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate)
        (query.timestamp as Record<string, unknown>).$gte = filters.startDate;
      if (filters.endDate)
        (query.timestamp as Record<string, unknown>).$lte = filters.endDate;
    }

    return this.auditLogModel
      .find(query)
      .sort({ timestamp: -1 })
      .limit(filters.limit || 100)
      .skip(filters.offset || 0)
      .exec();
  }

  /**
   * Busca logs de auditoria de um usuário específico (para LGPD)
   */
  async getUserAuditLogs(
    userId: string,
    limit: number = 100,
  ): Promise<IAuditLog[]> {
    return this.auditLogModel
      .find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Conta logs por severidade (para dashboards)
   */
  async getSeverityStats(
    startDate?: Date,
    endDate?: Date,
  ): Promise<Record<AuditSeverity, number>> {
    const matchStage: FilterQuery<IAuditLog> = {};
    if (startDate || endDate) {
      matchStage.timestamp = {};
      if (startDate)
        (matchStage.timestamp as Record<string, unknown>).$gte = startDate;
      if (endDate)
        (matchStage.timestamp as Record<string, unknown>).$lte = endDate;
    }

    const stats: { _id: AuditSeverity; count: number }[] =
      await this.auditLogModel.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$severity',
            count: { $sum: 1 },
          },
        },
      ]);

    const result: Record<AuditSeverity, number> = {
      [AuditSeverity.LOW]: 0,
      [AuditSeverity.MEDIUM]: 0,
      [AuditSeverity.HIGH]: 0,
      [AuditSeverity.CRITICAL]: 0,
    };

    stats.forEach((stat) => {
      result[stat._id] = stat.count;
    });

    return result;
  }

  /**
   * Detecta atividades suspeitas (para monitoramento de segurança)
   */
  async detectSuspiciousActivity(hours: number = 24): Promise<IAuditLog[]> {
    const since = new Date();
    since.setHours(since.getHours() - hours);

    // Busca por padrões suspeitos
    const suspiciousLogs = await this.auditLogModel
      .find({
        timestamp: { $gte: since },
        $or: [
          { severity: AuditSeverity.CRITICAL },
          { severity: AuditSeverity.HIGH },
          { action: AuditAction.LOGIN, success: false },
          { action: AuditAction.DATA_ACCESS, success: false },
        ],
      })
      .sort({ timestamp: -1 })
      .limit(50)
      .exec();

    return suspiciousLogs;
  }

  /**
   * Logs específicos para LGPD compliance
   */
  async logDataAccess(
    userId: string,
    resource: string,
    resourceId: string,
    accessorId: string,
    purpose: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    await this.log(
      AuditAction.DATA_ACCESS,
      resource,
      {
        resourceId,
        accessorId,
        purpose,
        lgpdCompliance: true,
      },
      {
        userId,
        resourceId,
        severity: AuditSeverity.MEDIUM,
        ipAddress,
        userAgent,
      },
    );
  }

  async logConsentChange(
    userId: string,
    consentType: string,
    action: 'grant' | 'revoke',
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    await this.log(
      action === 'grant'
        ? AuditAction.CONSENT_GRANT
        : AuditAction.CONSENT_REVOKE,
      'consent',
      {
        consentType,
        lgpdCompliance: true,
      },
      {
        userId,
        severity: AuditSeverity.HIGH,
        ipAddress,
        userAgent,
      },
    );
  }

  async logDataExport(
    userId: string,
    requestId: string,
    dataTypes: string[],
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    await this.log(
      AuditAction.DATA_EXPORT,
      'user_data',
      {
        requestId,
        dataTypes,
        lgpdCompliance: true,
      },
      {
        userId,
        severity: AuditSeverity.HIGH,
        ipAddress,
        userAgent,
      },
    );
  }
}
