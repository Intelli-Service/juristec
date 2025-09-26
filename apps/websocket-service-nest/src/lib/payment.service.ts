import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as pagarme from 'pagarme';
import { IPayment, PaymentStatus, PaymentMethod } from '../models/Payment';
import {
  IPaymentTransaction,
  TransactionType,
  TransactionStatus,
} from '../models/PaymentTransaction';
import Conversation from '../models/Conversation';
import Payment from '../models/Payment';
import PaymentTransaction from '../models/PaymentTransaction';

interface CreatePaymentDto {
  conversationId: string;
  clientId: string;
  lawyerId: string;
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
  };
}

interface PaymentConfig {
  apiKey: string;
  encryptionKey: string;
  platformFee: number; // Taxa da plataforma em %
  lawyerPercentage: number; // Porcentagem que vai para o advogado
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly config: PaymentConfig;

  constructor(
    @InjectModel('Payment') private paymentModel: Model<IPayment>,
    @InjectModel('PaymentTransaction')
    private transactionModel: Model<IPaymentTransaction>,
    @InjectModel('Conversation') private conversationModel: Model<any>,
  ) {
    this.config = {
      apiKey: process.env.PAGARME_API_KEY || '',
      encryptionKey: process.env.PAGARME_ENCRYPTION_KEY || '',
      platformFee: parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || '20'), // 20% padrão
      lawyerPercentage: parseFloat(
        process.env.LAWYER_PAYMENT_PERCENTAGE || '80',
      ), // 80% para o advogado
    };

    if (!this.config.apiKey) {
      throw new Error('PAGARME_API_KEY não configurada');
    }
  }

  async createPayment(createPaymentDto: CreatePaymentDto): Promise<IPayment> {
    try {
      // Buscar dados da conversa para enriquecer o pagamento
      const conversation = await this.conversationModel.findOne({
        roomId: createPaymentDto.conversationId,
      });
      if (!conversation) {
        throw new BadRequestException('Conversa não encontrada');
      }

      // Calcular valores do split
      const platformFeeAmount = Math.round(
        createPaymentDto.amount * (this.config.platformFee / 100),
      );
      const lawyerAmount = createPaymentDto.amount - platformFeeAmount;

      // Criar registro do pagamento
      const payment = new this.paymentModel({
        conversationId: createPaymentDto.conversationId,
        clientId: createPaymentDto.clientId,
        lawyerId: createPaymentDto.lawyerId,
        amount: createPaymentDto.amount,
        paymentMethod: createPaymentDto.paymentMethod,
        installments: createPaymentDto.installments || 1,
        description: `Consulta jurídica - ${conversation.classification?.category || 'Geral'}`,
        splitRules: [
          {
            recipientId: process.env.PLATFORM_RECIPIENT_ID || '',
            percentage: this.config.platformFee,
            liable: true,
            chargeProcessingFee: true,
          },
          {
            recipientId: process.env.LAWYER_RECIPIENT_ID || '',
            percentage: this.config.lawyerPercentage,
            liable: false,
            chargeProcessingFee: false,
          },
        ],
        metadata: {
          caseCategory:
            createPaymentDto.metadata?.caseCategory ||
            conversation.classification?.category,
          caseComplexity:
            createPaymentDto.metadata?.caseComplexity ||
            conversation.classification?.complexity,
          lawyerSpecialization: createPaymentDto.metadata?.lawyerSpecialization,
          platformFee: platformFeeAmount,
        },
      });

      await payment.save();

      // Processar pagamento no Pagar.me
      const pagarmeData = await this.processPagarmePayment(
        payment,
        createPaymentDto,
      );

      // Atualizar pagamento com dados do Pagar.me
      payment.externalId = pagarmeData.id;
      payment.transactionId = pagarmeData.tid;
      payment.status = this.mapPagarmeStatus(pagarmeData.status);
      await payment.save();

      // Criar transação
      await this.createTransaction(
        payment,
        pagarmeData,
        TransactionType.PAYMENT,
      );

      return payment;
    } catch (error) {
      this.logger.error(
        `Erro ao criar pagamento: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Erro ao processar pagamento');
    }
  }

  private async processPagarmePayment(
    payment: IPayment,
    dto: CreatePaymentDto,
  ): Promise<any> {
    const client = await pagarme.client.connect({
      api_key: this.config.apiKey,
    });

    const paymentData: any = {
      amount: payment.amount,
      payment_method: dto.paymentMethod,
      installments: dto.installments || 1,
      customer: {
        external_id: dto.clientId,
        name: 'Cliente', // TODO: Buscar nome do usuário
        email: 'cliente@email.com', // TODO: Buscar email do usuário
      },
      items: [
        {
          id: payment._id.toString(),
          title: payment.description,
          unit_price: payment.amount,
          quantity: 1,
          tangible: false,
        },
      ],
      split_rules: payment.splitRules?.map((rule) => ({
        recipient_id: rule.recipientId,
        percentage: rule.percentage,
        liable: rule.liable,
        charge_processing_fee: rule.chargeProcessingFee,
      })),
    };

    // Configurar método de pagamento específico
    switch (dto.paymentMethod) {
      case PaymentMethod.CREDIT_CARD:
      case PaymentMethod.DEBIT_CARD:
        if (!dto.cardData) {
          throw new BadRequestException('Dados do cartão são obrigatórios');
        }
        paymentData.card_number = dto.cardData.cardNumber.replace(/\s/g, '');
        paymentData.card_holder_name = dto.cardData.cardHolderName;
        paymentData.card_expiration_date =
          dto.cardData.cardExpirationDate.replace(/\D/g, '');
        paymentData.card_cvv = dto.cardData.cardCvv;
        break;

      case PaymentMethod.PIX:
        paymentData.pix = {
          expires_in: dto.pixData?.expiresIn || 3600, // 1 hora padrão
        };
        break;

      case PaymentMethod.BOLETO:
        paymentData.boleto = {
          expires_in: dto.boletoData?.expiresIn || 86400, // 24 horas padrão
        };
        break;
    }

    try {
      const transaction = await client.transactions.create(paymentData);
      return transaction;
    } catch (error) {
      this.logger.error(`Erro no Pagar.me: ${error.message}`, error);
      throw new BadRequestException(
        `Erro no processamento do pagamento: ${error.message}`,
      );
    }
  }

  private mapPagarmeStatus(pagarmeStatus: string): PaymentStatus {
    switch (pagarmeStatus) {
      case 'processing':
      case 'waiting_payment':
        return PaymentStatus.PENDING;
      case 'authorized':
        return PaymentStatus.AUTHORIZED;
      case 'paid':
        return PaymentStatus.PAID;
      case 'refunded':
        return PaymentStatus.REFUNDED;
      case 'refused':
      case 'chargedback':
        return PaymentStatus.FAILED;
      default:
        return PaymentStatus.PENDING;
    }
  }

  private async createTransaction(
    payment: IPayment,
    pagarmeData: any,
    type: TransactionType,
  ): Promise<IPaymentTransaction> {
    const transaction = new this.transactionModel({
      paymentId: payment._id,
      externalId: pagarmeData.id,
      type,
      status: TransactionStatus.SUCCESS,
      amount: payment.amount,
      fee: pagarmeData.cost || 0,
      netAmount: payment.amount - (pagarmeData.cost || 0),
      description: `Transação ${type} - ${payment.description}`,
      metadata: {
        pagarmeTransactionId: pagarmeData.tid,
        pagarmeStatus: pagarmeData.status,
        cardLastDigits: pagarmeData.card?.last_digits,
        cardBrand: pagarmeData.card?.brand,
        pixQrCode: pagarmeData.pix?.qr_code,
        boletoUrl: pagarmeData.boleto?.url,
        boletoBarcode: pagarmeData.boleto?.barcode,
      },
      processedAt: new Date(),
    });

    return transaction.save();
  }

  async getPaymentById(paymentId: string): Promise<IPayment | null> {
    return this.paymentModel.findById(paymentId).exec();
  }

  async getPaymentsByConversation(conversationId: string): Promise<IPayment[]> {
    return this.paymentModel
      .find({ conversationId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getPaymentsByClient(clientId: string): Promise<IPayment[]> {
    return this.paymentModel.find({ clientId }).sort({ createdAt: -1 }).exec();
  }

  async getPaymentsByLawyer(lawyerId: string): Promise<IPayment[]> {
    return this.paymentModel.find({ lawyerId }).sort({ createdAt: -1 }).exec();
  }

  async processWebhook(webhookData: any): Promise<void> {
    try {
      const { id, status, event } = webhookData;

      // Buscar pagamento pelo ID do Pagar.me
      const payment = await this.paymentModel.findOne({ externalId: id });
      if (!payment) {
        this.logger.warn(`Pagamento não encontrado para webhook: ${id}`);
        return;
      }

      // Atualizar status do pagamento
      const newStatus = this.mapPagarmeStatus(status);
      payment.status = newStatus;

      // Atualizar datas específicas
      if (newStatus === PaymentStatus.PAID && !payment.paidAt) {
        payment.paidAt = new Date();
      } else if (
        newStatus === PaymentStatus.CANCELLED &&
        !payment.cancelledAt
      ) {
        payment.cancelledAt = new Date();
      } else if (newStatus === PaymentStatus.REFUNDED && !payment.refundedAt) {
        payment.refundedAt = new Date();
      }

      payment.webhookData = webhookData;
      await payment.save();

      // Registrar evento na transação
      await this.transactionModel.updateOne(
        { paymentId: payment._id },
        {
          $push: {
            webhookEvents: {
              event,
              data: webhookData,
              receivedAt: new Date(),
            },
          },
        },
      );

      this.logger.log(
        `Webhook processado: ${event} para pagamento ${payment._id}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar webhook: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async refundPayment(paymentId: string, amount?: number): Promise<IPayment> {
    const payment = await this.paymentModel.findById(paymentId);
    if (!payment) {
      throw new BadRequestException('Pagamento não encontrado');
    }

    if (payment.status !== PaymentStatus.PAID) {
      throw new BadRequestException(
        'Apenas pagamentos pagos podem ser reembolsados',
      );
    }

    try {
      const client = await pagarme.client.connect({
        api_key: this.config.apiKey,
      });
      const refundData = {
        id: payment.externalId,
        amount: amount || payment.amount,
      };

      const refund = await client.transactions.refund(refundData);

      // Atualizar pagamento
      payment.status = PaymentStatus.REFUNDED;
      payment.refundedAt = new Date();
      payment.refundAmount = amount || payment.amount;
      await payment.save();

      // Criar transação de reembolso
      await this.createTransaction(payment, refund, TransactionType.REFUND);

      return payment;
    } catch (error) {
      this.logger.error(
        `Erro ao reembolsar pagamento: ${error.message}`,
        error,
      );
      throw new InternalServerErrorException('Erro ao processar reembolso');
    }
  }
}
