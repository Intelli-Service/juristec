import { Controller, Post, Body, Logger, Headers } from '@nestjs/common';
import { BillingService } from '../lib/billing.service';
import { ChargeStatus } from '../models/Charge';

interface PagarmeWebhookPayload {
  id: string;
  event: string;
  data: {
    id: string;
    status: string;
    amount: number;
    payment_method: string;
    charges?: Array<{
      id: string;
      status: string;
      amount: number;
      last_transaction?: {
        id: string;
        status: string;
        amount: number;
      };
    }>;
    metadata?: {
      chargeId?: string;
      conversationId?: string;
    };
  };
}

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly billingService: BillingService) {}

  @Post('pagarme')
  async handlePagarmeWebhook(
    @Body() payload: PagarmeWebhookPayload,
    @Headers('x-signature') signature?: string,
  ) {
    try {
      this.logger.log(`Webhook recebido: ${payload.event} - ID: ${payload.id}`);

      // TODO: Verificar assinatura do webhook para segurança
      // if (!this.verifySignature(payload, signature)) {
      //   this.logger.error('Assinatura do webhook inválida');
      //   return { error: 'Invalid signature' };
      // }

      // Processar diferentes tipos de eventos
      switch (payload.event) {
        case 'payment.created':
          await this.handlePaymentCreated(payload.data);
          break;

        case 'payment.updated':
          await this.handlePaymentUpdated(payload.data);
          break;

        case 'charge.succeeded':
          await this.handleChargeSucceeded(payload.data);
          break;

        case 'charge.failed':
          await this.handleChargeFailed(payload.data);
          break;

        default:
          this.logger.log(`Evento não processado: ${payload.event}`);
      }

      return { received: true };
    } catch (error) {
      this.logger.error('Erro ao processar webhook:', error);
      throw error;
    }
  }

  private async handlePaymentCreated(data: PagarmeWebhookPayload['data']) {
    this.logger.log(`Pagamento criado: ${data.id} - Status: ${data.status}`);

    // Se o pagamento foi criado com sucesso, podemos atualizar o status
    if (data.status === 'paid' && data.metadata?.chargeId) {
      await this.billingService.updateChargeStatus({
        chargeId: data.metadata.chargeId,
        status: ChargeStatus.PAID,
      });
    }
  }

  private async handlePaymentUpdated(data: PagarmeWebhookPayload['data']) {
    this.logger.log(`Pagamento atualizado: ${data.id} - Status: ${data.status}`);

    // Atualizar status baseado no novo status do pagamento
    if (data.metadata?.chargeId) {
      const newStatus = this.mapPaymentStatusToChargeStatus(data.status);

      if (newStatus) {
        await this.billingService.updateChargeStatus({
          chargeId: data.metadata.chargeId,
          status: newStatus,
        });
      }
    }
  }

  private async handleChargeSucceeded(data: PagarmeWebhookPayload['data']) {
    this.logger.log(`Cobrança bem-sucedida: ${data.id}`);

    // Se temos o ID da cobrança nos metadados, marcar como paga
    if (data.metadata?.chargeId) {
      await this.billingService.updateChargeStatus({
        chargeId: data.metadata.chargeId,
        status: ChargeStatus.PAID,
      });
    }
  }

  private async handleChargeFailed(data: PagarmeWebhookPayload['data']) {
    this.logger.log(`Cobrança falhou: ${data.id}`);

    // Se temos o ID da cobrança nos metadados, podemos tomar ações adicionais
    if (data.metadata?.chargeId) {
      // Por enquanto, apenas logar. Podemos implementar retry ou notificações
      this.logger.warn(`Cobrança falhou para chargeId: ${data.metadata.chargeId}`);
    }
  }

  private mapPaymentStatusToChargeStatus(paymentStatus: string): ChargeStatus | null {
    switch (paymentStatus) {
      case 'paid':
        return ChargeStatus.PAID;
      case 'failed':
      case 'canceled':
        return ChargeStatus.REJECTED;
      default:
        return null;
    }
  }

  // TODO: Implementar verificação de assinatura
  // private verifySignature(payload: PagarmeWebhookPayload, signature?: string): boolean {
  //   if (!signature) return false;
  //
  //   const expectedSignature = crypto
  //     .createHmac('sha256', process.env.PAGARME_WEBHOOK_SECRET)
  //     .update(JSON.stringify(payload))
  //     .digest('hex');
  //
  //   return crypto.timingSafeEqual(
  //     Buffer.from(signature),
  //     Buffer.from(expectedSignature)
  //   );
  // }
}