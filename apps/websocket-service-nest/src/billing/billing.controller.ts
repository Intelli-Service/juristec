import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import {
  BillingService,
  CreateChargeDto,
  UpdateChargeStatusDto,
} from '../lib/billing.service';
import { NextAuthGuard, Roles, JwtPayload } from '../guards/nextauth.guard';
import { ChargeType, ChargeStatus } from '../models/Charge';

interface CreateChargeRequest {
  conversationId: string;
  amount: number;
  type: ChargeType;
  title: string;
  description: string;
  reason: string;
  metadata?: {
    caseCategory?: string;
    caseComplexity?: string;
    estimatedHours?: number;
    urgency?: 'low' | 'medium' | 'high' | 'urgent';
  };
  splitConfig?: {
    lawyerPercentage?: number;
    platformPercentage?: number;
  };
}

interface UpdateChargeStatusRequest {
  status: ChargeStatus;
  reason?: string;
}

@Controller('billing')
@UseGuards(NextAuthGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  /**
   * Criar nova cobrança (apenas advogados)
   */
  @Post('create-charge')
  @Roles('lawyer', 'super_admin')
  async createCharge(@Body() body: CreateChargeRequest, @Request() req: any) {
    const user = req.user as JwtPayload;

    return this.billingService.createCharge({
      ...body,
      lawyerId: user.userId,
      clientId: body.conversationId, // TODO: Obter clientId da conversa
    });
  }

  /**
   * Cliente aceita cobrança e inicia pagamento
   */
  @Post('accept-charge/:chargeId')
  @Roles('client', 'super_admin')
  async acceptCharge(@Param('chargeId') chargeId: string, @Request() req: any) {
    const user = req.user as JwtPayload;

    return this.billingService.acceptChargeAndCreatePayment(
      chargeId,
      user.userId,
    );
  }

  /**
   * Cliente rejeita cobrança
   */
  @Post('reject-charge/:chargeId')
  @Roles('client', 'super_admin')
  async rejectCharge(
    @Param('chargeId') chargeId: string,
    @Body() body: { reason?: string },
    @Request() req: any,
  ) {
    const user = req.user as JwtPayload;

    return this.billingService.rejectCharge(chargeId, user.userId, body.reason);
  }

  /**
   * Atualizar status da cobrança (sistema interno)
   */
  @Put('charge/:chargeId/status')
  @Roles('lawyer', 'super_admin')
  async updateChargeStatus(
    @Param('chargeId') chargeId: string,
    @Body() body: UpdateChargeStatusRequest,
    @Request() req: any,
  ) {
    const user = req.user as JwtPayload;

    return this.billingService.updateChargeStatus({
      chargeId,
      status: body.status,
      reason: body.reason,
    });
  }

  /**
   * Cancelar cobrança (apenas advogado que criou)
   */
  @Delete('charge/:chargeId')
  @Roles('lawyer', 'super_admin')
  async cancelCharge(@Param('chargeId') chargeId: string, @Request() req: any) {
    const user = req.user as JwtPayload;

    return this.billingService.cancelCharge(chargeId, user.userId);
  }

  /**
   * Listar cobranças de uma conversa
   */
  @Get('conversation/:conversationId')
  @Roles('client', 'lawyer', 'super_admin')
  async getChargesByConversation(
    @Param('conversationId') conversationId: string,
  ) {
    return this.billingService.getChargesByConversation(conversationId);
  }

  /**
   * Listar cobranças do advogado logado
   */
  @Get('lawyer')
  @Roles('lawyer', 'super_admin')
  async getLawyerCharges(@Request() req: any) {
    const user = req.user as JwtPayload;
    return this.billingService.getChargesByLawyer(user.userId);
  }

  /**
   * Listar cobranças do cliente logado
   */
  @Get('client')
  @Roles('client', 'super_admin')
  async getClientCharges(@Request() req: any) {
    const user = req.user as JwtPayload;
    return this.billingService.getChargesByClient(user.userId);
  }

  /**
   * Obter cobrança por ID
   */
  @Get('charge/:chargeId')
  @Roles('client', 'lawyer', 'super_admin')
  async getChargeById(
    @Param('chargeId') chargeId: string,
    @Request() req: any,
  ) {
    const user = req.user as JwtPayload;
    const charge = await this.billingService.getChargeById(chargeId);

    // Verificar permissões: apenas envolvidos podem ver
    if (
      charge.lawyerId !== user.userId &&
      charge.clientId !== user.userId &&
      user.role !== 'super_admin'
    ) {
      throw new Error('Acesso negado');
    }

    return charge;
  }

  /**
   * Estatísticas de cobrança (dashboard)
   */
  @Get('stats')
  @Roles('lawyer', 'super_admin')
  async getBillingStats(@Request() req: any) {
    const user = req.user as JwtPayload;
    return this.billingService.getBillingStats(
      user.role === 'lawyer' ? user.userId : undefined,
    );
  }
}
