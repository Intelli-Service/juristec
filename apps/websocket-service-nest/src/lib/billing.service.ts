import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ICharge, ChargeStatus, ChargeType } from '../models/Charge';
import Conversation from '../models/Conversation';

export interface CreateChargeDto {
  conversationId: string;
  lawyerId: string;
  clientId: string;
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

export interface UpdateChargeStatusDto {
  chargeId: string;
  status: ChargeStatus;
  reason?: string;
}

@Injectable()
export class BillingService {
  constructor(
    @InjectModel('Charge') private chargeModel: Model<ICharge>,
    @InjectModel('Conversation') private conversationModel: Model<any>
  ) {}

  /**
   * Cria uma nova cobrança
   */
  async createCharge(createChargeDto: CreateChargeDto): Promise<ICharge> {
    // Verificar se a conversa existe e está atribuída ao advogado
    const conversation = await this.conversationModel.findOne({
      roomId: createChargeDto.conversationId
    });

    if (!conversation) {
      throw new NotFoundException('Conversa não encontrada');
    }

    if (conversation.assignedTo !== createChargeDto.lawyerId) {
      throw new ForbiddenException('Apenas o advogado responsável pode criar cobranças');
    }

    if (!conversation.billing?.enabled) {
      throw new ForbiddenException('Cobranças não estão habilitadas para esta conversa');
    }

    // Validar valor mínimo
    if (createChargeDto.amount < 100) { // R$ 1,00
      throw new BadRequestException('Valor mínimo para cobrança é R$ 1,00');
    }

    // Calcular configurações de split
    const lawyerPercentage = createChargeDto.splitConfig?.lawyerPercentage || 95;
    const platformPercentage = createChargeDto.splitConfig?.platformPercentage || 5;
    const platformFee = Math.round(createChargeDto.amount * (platformPercentage / 100));

    // Criar cobrança
    const charge = new this.chargeModel({
      conversationId: createChargeDto.conversationId,
      lawyerId: createChargeDto.lawyerId,
      clientId: createChargeDto.clientId,
      amount: createChargeDto.amount,
      type: createChargeDto.type,
      title: createChargeDto.title,
      description: createChargeDto.description,
      reason: createChargeDto.reason,
      metadata: createChargeDto.metadata,
      splitConfig: {
        lawyerPercentage,
        platformPercentage,
        platformFee
      }
    });

    await charge.save();

    // Atualizar conversa com nova cobrança
    await this.conversationModel.findByIdAndUpdate(conversation._id, {
      $push: { 'billing.charges': charge._id.toString() },
      $inc: { 'billing.totalCharged': createChargeDto.amount },
      'billing.lastChargeAt': new Date()
    });

    // Notificar via WebSocket
    // TODO: Implementar notificação via WebSocket
    // await this.chatGateway.notifyChargeCreated(createChargeDto.conversationId, charge);

    return charge;
  }

  /**
   * Atualiza status de uma cobrança
   */
  async updateChargeStatus(updateDto: UpdateChargeStatusDto): Promise<ICharge> {
    const charge = await this.chargeModel.findById(updateDto.chargeId);

    if (!charge) {
      throw new NotFoundException('Cobrança não encontrada');
    }

    // Validar transições de status permitidas
    const allowedTransitions: Record<ChargeStatus, ChargeStatus[]> = {
      [ChargeStatus.PENDING]: [ChargeStatus.ACCEPTED, ChargeStatus.REJECTED, ChargeStatus.CANCELLED],
      [ChargeStatus.ACCEPTED]: [ChargeStatus.PAID, ChargeStatus.CANCELLED],
      [ChargeStatus.REJECTED]: [], // Status final
      [ChargeStatus.CANCELLED]: [], // Status final
      [ChargeStatus.EXPIRED]: [], // Status final
      [ChargeStatus.PAID]: [] // Status final
    };

    if (!allowedTransitions[charge.status].includes(updateDto.status)) {
      throw new BadRequestException(`Transição de status não permitida: ${charge.status} → ${updateDto.status}`);
    }

    // Atualizar campos específicos baseados no novo status
    const updateData: any = { status: updateDto.status };

    switch (updateDto.status) {
      case ChargeStatus.ACCEPTED:
        updateData.acceptedAt = new Date();
        break;
      case ChargeStatus.REJECTED:
        updateData.rejectedAt = new Date();
        break;
      case ChargeStatus.CANCELLED:
        updateData.cancelledAt = new Date();
        break;
    }

    const updatedCharge = await this.chargeModel.findByIdAndUpdate(
      updateDto.chargeId,
      updateData,
      { new: true }
    );

    // Notificar via WebSocket sobre atualização de cobrança
    // TODO: Implementar notificação via WebSocket
    // await this.chatGateway.notifyChargeUpdated(updatedCharge!.conversationId, updatedCharge);

    return updatedCharge!;
  }

  /**
   * Cliente aceita uma cobrança e inicia o processo de pagamento
   */
  async acceptChargeAndCreatePayment(chargeId: string, clientId: string): Promise<any> {
    const charge = await this.chargeModel.findById(chargeId);

    if (!charge) {
      throw new NotFoundException('Cobrança não encontrada');
    }

    if (charge.clientId !== clientId) {
      throw new ForbiddenException('Apenas o cliente pode aceitar esta cobrança');
    }

    if (charge.status !== ChargeStatus.PENDING) {
      throw new BadRequestException('Esta cobrança não pode mais ser aceita');
    }

    // Atualizar status da cobrança
    const updatedCharge = await this.updateChargeStatus({
      chargeId,
      status: ChargeStatus.ACCEPTED
    });

    // Criar pagamento no Pagar.me
    // TODO: Implementar integração com serviço de pagamento
    // const payment = await this.paymentService.createPayment({...});

    // Por enquanto, apenas atualizar o status da cobrança
    // await this.chargeModel.findByIdAndUpdate(chargeId, {
    // });

    // Notificar via WebSocket sobre cobrança aceita
    // TODO: Implementar notificação via WebSocket
    // await this.chatGateway.notifyChargeUpdated(charge.conversationId, charge);

    return {
      charge: updatedCharge
    };
  }

  /**
   * Cliente rejeita uma cobrança
   */
  async rejectCharge(chargeId: string, clientId: string, reason?: string): Promise<ICharge> {
    const charge = await this.chargeModel.findById(chargeId);

    if (!charge) {
      throw new NotFoundException('Cobrança não encontrada');
    }

    if (charge.clientId !== clientId) {
      throw new ForbiddenException('Apenas o cliente pode rejeitar esta cobrança');
    }

    if (charge.status !== ChargeStatus.PENDING) {
      throw new BadRequestException('Esta cobrança não pode mais ser rejeitada');
    }

    return this.updateChargeStatus({
      chargeId,
      status: ChargeStatus.REJECTED,
      reason
    });
  }

  /**
   * Lista cobranças de uma conversa
   */
  async getChargesByConversation(conversationId: string): Promise<ICharge[]> {
    return this.chargeModel.find({ conversationId }).sort({ createdAt: -1 });
  }

  /**
   * Lista cobranças de um advogado
   */
  async getChargesByLawyer(lawyerId: string): Promise<ICharge[]> {
    return this.chargeModel.find({ lawyerId }).sort({ createdAt: -1 });
  }

  /**
   * Lista cobranças de um cliente
   */
  async getChargesByClient(clientId: string): Promise<ICharge[]> {
    return this.chargeModel.find({ clientId }).sort({ createdAt: -1 });
  }

  /**
   * Obtém cobrança por ID
   */
  async getChargeById(chargeId: string): Promise<ICharge> {
    const charge = await this.chargeModel.findById(chargeId);

    if (!charge) {
      throw new NotFoundException('Cobrança não encontrada');
    }

    return charge;
  }

  /**
   * Cancela uma cobrança (apenas pelo advogado que criou)
   */
  async cancelCharge(chargeId: string, lawyerId: string): Promise<ICharge> {
    const charge = await this.chargeModel.findById(chargeId);

    if (!charge) {
      throw new NotFoundException('Cobrança não encontrada');
    }

    if (charge.lawyerId !== lawyerId) {
      throw new ForbiddenException('Apenas o advogado que criou pode cancelar a cobrança');
    }

    if (![ChargeStatus.PENDING, ChargeStatus.ACCEPTED].includes(charge.status)) {
      throw new BadRequestException('Esta cobrança não pode ser cancelada');
    }

    return this.updateChargeStatus({
      chargeId,
      status: ChargeStatus.CANCELLED
    });
  }

  /**
   * Estatísticas de cobrança para dashboard
   */
  async getBillingStats(lawyerId?: string): Promise<any> {
    const matchStage = lawyerId ? { lawyerId } : {};

    const stats = await this.chargeModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const result = {
      totalCharges: 0,
      totalAmount: 0,
      byStatus: {}
    };

    stats.forEach(stat => {
      result.byStatus[stat._id] = {
        count: stat.count,
        amount: stat.totalAmount
      };
      result.totalCharges += stat.count;
      result.totalAmount += stat.totalAmount;
    });

    return result;
  }
}