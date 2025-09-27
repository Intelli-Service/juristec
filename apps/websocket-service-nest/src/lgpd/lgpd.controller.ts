import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { LGPDService } from '../lib/lgpd.service';
import { ConsentType } from '../models/Consent';
import { DataSubjectRight, RequestStatus } from '../models/DataSubjectRequest';

@Controller('lgpd')
@UseGuards(JwtAuthGuard)
export class LGPDController {
  constructor(private lgpdService: LGPDService) {}

  // ========== ENDPOINTS DE CONSENTIMENTO ==========

  @Post('consent')
  async createConsent(
    @Request() req: any,
    @Body()
    body: {
      type: ConsentType;
      description: string;
      purpose: string;
      dataCategories: string[];
      retentionPeriod: number;
      legalBasis: string;
      version: string;
    },
  ) {
    const userId = req.user.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || 'unknown';

    return this.lgpdService.createConsent(
      userId,
      body.type,
      body.description,
      body.purpose,
      body.dataCategories,
      body.retentionPeriod,
      body.legalBasis,
      body.version,
      ipAddress,
      userAgent,
    );
  }

  @Put('consent/:consentId/grant')
  async grantConsent(
    @Request() req: any,
    @Param('consentId') consentId: string,
  ) {
    const userId = req.user.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || 'unknown';

    return this.lgpdService.grantConsent(
      userId,
      consentId,
      ipAddress,
      userAgent,
    );
  }

  @Put('consent/:consentId/revoke')
  async revokeConsent(
    @Request() req: any,
    @Param('consentId') consentId: string,
  ) {
    const userId = req.user.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || 'unknown';

    return this.lgpdService.revokeConsent(
      userId,
      consentId,
      ipAddress,
      userAgent,
    );
  }

  @Get('consent')
  async getUserConsents(@Request() req: any) {
    const userId = req.user.id;
    return this.lgpdService.getUserConsents(userId);
  }

  @Get('consent/:type/check')
  async checkConsent(@Request() req: any, @Param('type') type: ConsentType) {
    const userId = req.user.id;
    const hasConsent = await this.lgpdService.hasActiveConsent(userId, type);
    return { hasConsent };
  }

  // ========== ENDPOINTS DE DIREITOS DO TITULAR ==========

  @Post('data-subject-request')
  async createDataSubjectRequest(
    @Request() req: any,
    @Body()
    body: {
      right: DataSubjectRight;
      description: string;
      justification?: string;
      requestedData?: string[];
      attachments?: string[];
      priority?: 'low' | 'medium' | 'high' | 'urgent';
    },
  ) {
    const userId = req.user.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || 'unknown';

    return this.lgpdService.createDataSubjectRequest(
      userId,
      body.right,
      body.description,
      ipAddress,
      userAgent,
      body.justification,
      body.requestedData,
      body.attachments,
      body.priority,
    );
  }

  @Get('data-subject-request')
  async getUserDataSubjectRequests(@Request() req: any) {
    const userId = req.user.id;
    return this.lgpdService.getUserDataSubjectRequests(userId);
  }

  @Get('data-subject-request/:requestId')
  async getDataSubjectRequest(
    @Request() req: any,
    @Param('requestId') requestId: string,
  ) {
    const userId = req.user.id;
    const requests = await this.lgpdService.getUserDataSubjectRequests(userId);
    const request = requests.find((r) => r._id.toString() === requestId);

    if (!request) {
      throw new BadRequestException(
        'Solicitação não encontrada ou não pertence ao usuário',
      );
    }

    return request;
  }

  // ========== ENDPOINTS DE EXPORTAÇÃO DE DADOS ==========

  @Post('export-data')
  async exportUserData(@Request() req: any) {
    const userId = req.user.id;
    const exportData = await this.lgpdService.exportUserData(userId);

    // Em uma implementação real, isso geraria um arquivo e retornaria um link
    return {
      message: 'Dados exportados com sucesso',
      exportId: `export_${Date.now()}`,
      data: exportData,
      downloadUrl: `/api/lgpd/download-export/${userId}`, // Placeholder
    };
  }

  // ========== ENDPOINTS ADMINISTRATIVOS ==========
  // Estes endpoints só devem ser acessíveis por admins

  @Get('admin/data-subject-requests')
  async getDataSubjectRequests(
    @Query()
    query: {
      status?: RequestStatus;
      priority?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    // TODO: Adicionar guard para verificar se usuário é admin
    return this.lgpdService.getDataSubjectRequests(query);
  }

  @Put('admin/data-subject-request/:requestId/process')
  async processDataSubjectRequest(
    @Request() req: any,
    @Param('requestId') requestId: string,
    @Body()
    body: {
      status: RequestStatus;
      response?: string;
      responseAttachments?: string[];
    },
  ) {
    // TODO: Adicionar guard para verificar se usuário é admin
    const adminId = req.user.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || 'unknown';

    return this.lgpdService.processDataSubjectRequest(
      requestId,
      adminId,
      body.status,
      ipAddress,
      userAgent,
      body.response,
      body.responseAttachments,
    );
  }

  @Post('admin/cleanup-expired')
  async cleanupExpiredData() {
    // TODO: Adicionar guard para verificar se usuário é admin
    const expiredConsents = await this.lgpdService.cleanupExpiredConsents();
    const expiredRequests = await this.lgpdService.cleanupExpiredRequests();

    return {
      message: 'Limpeza executada com sucesso',
      expiredConsents,
      expiredRequests,
    };
  }
}
