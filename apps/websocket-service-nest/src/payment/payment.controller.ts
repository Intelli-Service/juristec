import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PaymentService } from '../lib/payment.service';
import { NextAuthGuard, Roles, JwtPayload } from '../guards/nextauth.guard';
import { PaymentMethod } from '../models/Payment';

interface CreatePaymentRequest {
  conversationId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  installments?: number;
  cardData?: {
    cardNumber: string;
    cardHolderName: string;
    cardExpirationDate: string;
    cardCvv: string;
  };
  pixData?: {
    expiresIn?: number;
  };
  boletoData?: {
    expiresIn?: number;
  };
  metadata?: {
    caseCategory?: string;
    caseComplexity?: string;
    lawyerSpecialization?: string;
    lawyerId?: string;
  };
}

@Controller('payment')
@UseGuards(NextAuthGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create')
  @Roles('client', 'super_admin')
  async createPayment(@Body() body: CreatePaymentRequest, @Request() req: any) {
    const user = req.user as JwtPayload;

    return this.paymentService.createPayment({
      ...body,
      clientId: user.userId,
      lawyerId: body.metadata?.lawyerId || '', // TODO: Obter do caso
    });
  }

  @Get('conversation/:conversationId')
  @Roles('client', 'lawyer', 'super_admin')
  async getPaymentsByConversation(
    @Param('conversationId') conversationId: string,
  ) {
    return this.paymentService.getPaymentsByConversation(conversationId);
  }

  @Get('client')
  @Roles('client', 'super_admin')
  async getClientPayments(@Request() req: any) {
    const user = req.user as JwtPayload;
    return this.paymentService.getPaymentsByClient(user.userId);
  }

  @Get('lawyer')
  @Roles('lawyer', 'super_admin')
  async getLawyerPayments(@Request() req: any) {
    const user = req.user as JwtPayload;
    return this.paymentService.getPaymentsByLawyer(user.userId);
  }

  @Get(':id')
  @Roles('client', 'lawyer', 'super_admin')
  async getPayment(@Param('id') paymentId: string) {
    return this.paymentService.getPaymentById(paymentId);
  }

  @Post(':id/refund')
  @Roles('super_admin')
  async refundPayment(
    @Param('id') paymentId: string,
    @Body() body: { amount?: number },
  ) {
    return this.paymentService.refundPayment(paymentId, body.amount);
  }

  @Post('webhook')
  async handleWebhook(@Body() webhookData: any) {
    // Webhook não precisa de autenticação pois vem do Pagar.me
    await this.paymentService.processWebhook(webhookData);
    return { received: true };
  }
}
