import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IConsent, ConsentType, ConsentStatus } from '../models/Consent';
import {
  IDataSubjectRequest,
  DataSubjectRight,
  RequestStatus,
} from '../models/DataSubjectRequest';
import { AuditService } from './audit.service';
import { EncryptionService } from './encryption.service';

@Injectable()
export class LGPDService {
  constructor(
    @InjectModel('Consent') private consentModel: Model<IConsent>,
    @InjectModel('DataSubjectRequest')
    private dataSubjectRequestModel: Model<IDataSubjectRequest>,
    private auditService: AuditService,
    private encryptionService: EncryptionService,
  ) {}

  // ========== GESTÃO DE CONSENTIMENTOS ==========

  /**
   * Cria um consentimento para um usuário
   */
  async createConsent(
    userId: string,
    type: ConsentType,
    description: string,
    purpose: string,
    dataCategories: string[],
    retentionPeriod: number,
    legalBasis: string,
    version: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<IConsent> {
    // Verifica se já existe um consentimento ativo
    const existingConsent = await this.consentModel.findOne({
      userId,
      type,
      status: { $in: [ConsentStatus.PENDING, ConsentStatus.GRANTED] },
    });

    if (existingConsent) {
      throw new BadRequestException(
        'Já existe um consentimento ativo para este tipo',
      );
    }

    const consent = new this.consentModel({
      userId,
      type,
      description,
      purpose,
      dataCategories,
      retentionPeriod,
      legalBasis,
      version,
      ipAddress,
      userAgent,
      expiresAt: this.calculateExpirationDate(retentionPeriod),
    });

    const savedConsent = await consent.save();

    await this.auditService.logConsentChange(
      userId,
      type,
      'grant',
      ipAddress,
      userAgent,
    );

    return savedConsent;
  }

  /**
   * Concede consentimento
   */
  async grantConsent(
    userId: string,
    consentId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<IConsent> {
    const consent = await this.consentModel.findOne({ _id: consentId, userId });

    if (!consent) {
      throw new NotFoundException('Consentimento não encontrado');
    }

    if (consent.status !== ConsentStatus.PENDING) {
      throw new BadRequestException('Consentimento não está pendente');
    }

    consent.status = ConsentStatus.GRANTED;
    consent.grantedAt = new Date();

    const updatedConsent = await consent.save();

    await this.auditService.logConsentChange(
      userId,
      consent.type,
      'grant',
      ipAddress,
      userAgent,
    );

    return updatedConsent;
  }

  /**
   * Revoga consentimento
   */
  async revokeConsent(
    userId: string,
    consentId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<IConsent> {
    const consent = await this.consentModel.findOne({ _id: consentId, userId });

    if (!consent) {
      throw new NotFoundException('Consentimento não encontrado');
    }

    consent.status = ConsentStatus.REVOKED;
    consent.revokedAt = new Date();

    const updatedConsent = await consent.save();

    await this.auditService.logConsentChange(
      userId,
      consent.type,
      'revoke',
      ipAddress,
      userAgent,
    );

    return updatedConsent;
  }

  /**
   * Lista consentimentos de um usuário
   */
  async getUserConsents(userId: string): Promise<IConsent[]> {
    return this.consentModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  /**
   * Verifica se usuário tem consentimento ativo para um tipo
   */
  async hasActiveConsent(userId: string, type: ConsentType): Promise<boolean> {
    const consent = await this.consentModel.findOne({
      userId,
      type,
      status: ConsentStatus.GRANTED,
      expiresAt: { $gt: new Date() },
    });

    return !!consent;
  }

  // ========== DIREITOS DOS TITULARES ==========

  /**
   * Cria uma solicitação de direitos do titular
   */
  async createDataSubjectRequest(
    userId: string,
    right: DataSubjectRight,
    description: string,
    ipAddress: string,
    userAgent: string,
    justification?: string,
    requestedData?: string[],
    attachments?: string[],
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium',
  ): Promise<IDataSubjectRequest> {
    // Gera token único para verificação
    const verificationToken = this.encryptionService.generateSecureToken();

    // Prazo de 30 dias para resposta (LGPD)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const request = new this.dataSubjectRequestModel({
      userId,
      right,
      description,
      justification,
      requestedData,
      attachments,
      verificationToken,
      ipAddress,
      userAgent,
      priority,
      expiresAt,
    });

    const savedRequest = await request.save();

    await this.auditService.log(
      'data_access' as any,
      'data_subject_request',
      {
        requestId: savedRequest._id,
        right,
        lgpdCompliance: true,
      },
      {
        userId,
        severity: 'high' as any,
        ipAddress,
        userAgent,
      },
    );

    return savedRequest;
  }

  /**
   * Processa uma solicitação de direitos
   */
  async processDataSubjectRequest(
    requestId: string,
    adminId: string,
    status: RequestStatus,
    ipAddress: string,
    userAgent: string,
    response?: string,
    responseAttachments?: string[],
  ): Promise<IDataSubjectRequest> {
    const request = await this.dataSubjectRequestModel.findById(requestId);

    if (!request) {
      throw new NotFoundException('Solicitação não encontrada');
    }

    request.status = status;
    request.respondedAt = new Date();
    request.respondedBy = adminId;

    if (response) {
      request.response = response;
    }

    if (responseAttachments) {
      request.responseAttachments = responseAttachments;
    }

    if (status === RequestStatus.COMPLETED) {
      request.completedAt = new Date();
    }

    const updatedRequest = await request.save();

    await this.auditService.log(
      'data_access' as any,
      'data_subject_request',
      {
        requestId,
        action: 'processed',
        status,
        lgpdCompliance: true,
      },
      {
        userId: adminId,
        severity: 'high' as any,
        ipAddress,
        userAgent,
      },
    );

    return updatedRequest;
  }

  /**
   * Lista solicitações de direitos (para admins)
   */
  async getDataSubjectRequests(
    filters: {
      status?: RequestStatus;
      priority?: string;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<IDataSubjectRequest[]> {
    const query: any = {};

    if (filters.status) query.status = filters.status;
    if (filters.priority) query.priority = filters.priority;

    return this.dataSubjectRequestModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(filters.limit || 50)
      .skip(filters.offset || 0)
      .exec();
  }

  /**
   * Lista solicitações de um usuário
   */
  async getUserDataSubjectRequests(
    userId: string,
  ): Promise<IDataSubjectRequest[]> {
    return this.dataSubjectRequestModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .exec();
  }

  // ========== EXPORTAÇÃO DE DADOS ==========

  /**
   * Exporta todos os dados pessoais de um usuário (LGPD)
   */
  async exportUserData(userId: string): Promise<Record<string, any>> {
    // Em uma implementação real, isso agregaria dados de todas as coleções
    const consents = await this.getUserConsents(userId);
    const requests = await this.getUserDataSubjectRequests(userId);
    const auditLogs = await this.auditService.getUserAuditLogs(userId, 1000);

    const exportData = {
      userId,
      exportDate: new Date(),
      consents: consents.map((consent) => ({
        type: consent.type,
        status: consent.status,
        grantedAt: consent.grantedAt,
        revokedAt: consent.revokedAt,
        dataCategories: consent.dataCategories,
        legalBasis: consent.legalBasis,
      })),
      dataSubjectRequests: requests.map((request) => ({
        right: request.right,
        status: request.status,
        description: request.description,
        createdAt: request.createdAt,
        completedAt: request.completedAt,
      })),
      auditLogs: auditLogs.map((log) => ({
        action: log.action,
        resource: log.resource,
        timestamp: log.timestamp,
        success: log.success,
      })),
    };

    return exportData;
  }

  // ========== UTILITÁRIOS ==========

  private calculateExpirationDate(retentionPeriod: number): Date {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + retentionPeriod);
    return expirationDate;
  }

  /**
   * Limpa consentimentos expirados (job periódico)
   */
  async cleanupExpiredConsents(): Promise<number> {
    const result = await this.consentModel.updateMany(
      {
        status: ConsentStatus.GRANTED,
        expiresAt: { $lt: new Date() },
      },
      {
        status: ConsentStatus.EXPIRED,
        updatedAt: new Date(),
      },
    );

    return result.modifiedCount;
  }

  /**
   * Limpa solicitações expiradas (job periódico)
   */
  async cleanupExpiredRequests(): Promise<number> {
    const result = await this.dataSubjectRequestModel.updateMany(
      {
        status: { $nin: [RequestStatus.COMPLETED, RequestStatus.REJECTED] },
        expiresAt: { $lt: new Date() },
      },
      {
        status: RequestStatus.REJECTED,
        response: 'Solicitação expirada - prazo de resposta excedido (LGPD)',
        completedAt: new Date(),
        updatedAt: new Date(),
      },
    );

    return result.modifiedCount;
  }
}
