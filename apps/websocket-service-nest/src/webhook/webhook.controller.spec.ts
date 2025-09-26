import { Test, TestingModule } from '@nestjs/testing';
import { WebhookController } from './webhook.controller';
import { BillingService } from '../lib/billing.service';

describe('WebhookController', () => {
  let controller: WebhookController;
  let billingService: jest.Mocked<BillingService>;

  beforeEach(async () => {
    const mockBillingService = {
      updateChargeStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookController],
      providers: [
        {
          provide: BillingService,
          useValue: mockBillingService,
        },
      ],
    }).compile();

    controller = module.get<WebhookController>(WebhookController);
    billingService = module.get(BillingService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handlePagarmeWebhook', () => {
    it('should handle payment.created event', async () => {
      const payload = {
        id: 'evt_test',
        event: 'payment.created',
        data: {
          id: 'pay_test',
          status: 'paid',
          amount: 10000,
          payment_method: 'credit_card',
          metadata: {
            chargeId: 'charge_test',
          },
        },
      };

      const result = await controller.handlePagarmeWebhook(payload);

      expect(result).toEqual({ received: true });
      expect(billingService.updateChargeStatus).toHaveBeenCalledWith({
        chargeId: 'charge_test',
        status: 'paid',
      });
    });

    it('should handle charge.succeeded event', async () => {
      const payload = {
        id: 'evt_test',
        event: 'charge.succeeded',
        data: {
          id: 'charge_test',
          status: 'paid',
          amount: 10000,
          payment_method: 'credit_card',
          metadata: {
            chargeId: 'charge_test',
          },
        },
      };

      const result = await controller.handlePagarmeWebhook(payload);

      expect(result).toEqual({ received: true });
      expect(billingService.updateChargeStatus).toHaveBeenCalledWith({
        chargeId: 'charge_test',
        status: 'paid',
      });
    });

    it('should handle unknown events gracefully', async () => {
      const payload = {
        id: 'evt_test',
        event: 'unknown.event',
        data: {
          id: 'test',
          status: 'unknown',
          amount: 0,
          payment_method: 'unknown',
        },
      };

      const result = await controller.handlePagarmeWebhook(payload);

      expect(result).toEqual({ received: true });
      expect(billingService.updateChargeStatus).not.toHaveBeenCalled();
    });
  });
});
