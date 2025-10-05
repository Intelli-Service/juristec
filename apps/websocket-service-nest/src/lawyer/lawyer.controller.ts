import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  UseGuards,
  Request,
  Body,
} from '@nestjs/common';
import { AIService } from '../lib/ai.service';
import { MessageService } from '../lib/message.service';
import Conversation from '../models/Conversation';
import {
  NextAuthGuard,
  Roles,
  Permissions,
  JwtPayload,
} from '../guards/nextauth.guard';

@Controller('lawyer')
@UseGuards(NextAuthGuard)
@Roles('lawyer', 'super_admin')
export class LawyerController {
  constructor(
    private aiService: AIService,
    private messageService: MessageService,
  ) {}

  // Dashboard do advogado - ver casos disponíveis e atribuídos
  @Get('cases')
  @Permissions('view_available_cases', 'view_all_cases')
  async getMyCases(@Request() req: { user: JwtPayload }) {
    return this.aiService.getCasesForLawyer(req.user.userId);
  }

  // Pegar um caso
  @Post('cases/:roomId/assign')
  @Permissions('assign_cases_to_self', 'assign_cases')
  async assignCase(
    @Param('roomId') roomId: string,
    @Request() req: { user: JwtPayload },
  ) {
    return this.aiService.assignCase(roomId, req.user.userId);
  }

  // Ver mensagens de um caso específico
  @Get('cases/:roomId/messages')
  @Permissions('access_assigned_chats', 'access_client_chat')
  async getCaseMessages(
    @Param('roomId') roomId: string,
    @Request() req: { user: JwtPayload },
  ) {
    try {
      const conversation = await Conversation.findOne({ roomId });
      if (!conversation) {
        throw new Error('Caso não encontrado');
      }

      // Usar MessageService para buscar mensagens com validações de permissões
      const messages = await this.messageService.getMessages(
        {
          conversationId: conversation._id.toString(),
          limit: 1000, // Limite alto para chat completo
        },
        {
          userId: req.user.userId,
          role: req.user.role,
          permissions: req.user.permissions,
        },
      );

      return messages;
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
      throw error;
    }
  }

  // Atualizar status do caso
  @Put('cases/:roomId/status')
  @Permissions('update_case_status')
  async updateCaseStatus(
    @Param('roomId') roomId: string,
    @Body('status') status: string,
    @Request() req: { user: JwtPayload },
  ) {
    const conversation = await Conversation.findOne({ roomId });
    if (!conversation) {
      throw new Error('Caso não encontrado');
    }

    // Check if lawyer has access to this case
    if (
      req.user.role === 'lawyer' &&
      conversation.assignedTo !== req.user.userId
    ) {
      throw new Error('Acesso negado a este caso');
    }

    return Conversation.findOneAndUpdate(
      { roomId },
      { status, updatedAt: new Date() },
      { new: true },
    );
  }

  // Fechar caso
  @Post('cases/:roomId/close')
  @Permissions('close_cases')
  async closeCase(
    @Param('roomId') roomId: string,
    @Body('resolution') resolution: string,
    @Request() req: { user: JwtPayload },
  ) {
    const conversation = await Conversation.findOne({ roomId });
    if (!conversation) {
      throw new Error('Caso não encontrado');
    }

    // Check if lawyer has access to this case
    if (
      req.user.role === 'lawyer' &&
      conversation.assignedTo !== req.user.userId
    ) {
      throw new Error('Acesso negado a este caso');
    }

    return Conversation.findOneAndUpdate(
      { roomId },
      {
        status: 'completed',
        resolution,
        closedAt: new Date(),
        closedBy: req.user.userId,
        updatedAt: new Date(),
      },
      { new: true },
    );
  }

  // Transferir caso para outro advogado
  @Post('cases/:roomId/transfer')
  @Permissions('transfer_cases')
  async transferCase(
    @Param('roomId') roomId: string,
    @Body('targetLawyerId') targetLawyerId: string,
    @Body('reason') reason: string,
    @Request() req: { user: JwtPayload },
  ) {
    const conversation = await Conversation.findOne({ roomId });
    if (!conversation) {
      throw new Error('Caso não encontrado');
    }

    // Check if lawyer has access to this case
    if (
      req.user.role === 'lawyer' &&
      conversation.assignedTo !== req.user.userId
    ) {
      throw new Error('Acesso negado a este caso');
    }

    return Conversation.findOneAndUpdate(
      { roomId },
      {
        assignedTo: targetLawyerId,
        transferHistory: [
          ...(conversation.transferHistory || []),
          {
            from: req.user.userId,
            to: targetLawyerId,
            reason,
            transferredAt: new Date(),
          },
        ],
        updatedAt: new Date(),
      },
      { new: true },
    );
  }

  // Estatísticas do advogado
  @Get('stats')
  @Permissions('view_own_stats')
  async getLawyerStats(@Request() req: { user: JwtPayload }) {
    const lawyerId = req.user.userId;

    const [totalCases, openCases, closedCases, assignedCases, availableCases] =
      await Promise.all([
        Conversation.countDocuments({ assignedTo: lawyerId }),
        Conversation.countDocuments({ assignedTo: lawyerId, status: 'open' }),
        Conversation.countDocuments({
          assignedTo: lawyerId,
          status: { $in: ['completed', 'abandoned', 'resolved_by_ai'] },
        }),
        Conversation.countDocuments({
          assignedTo: lawyerId,
          status: 'assigned',
        }),
        // Casos disponíveis para atribuição (precisam de advogado mas não foram atribuídos)
        Conversation.countDocuments({
          lawyerNeeded: true,
          assignedTo: { $exists: false },
          status: { $nin: ['completed', 'abandoned', 'resolved_by_ai'] },
        }),
      ]);

    // Casos fechados nos últimos 30 dias
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentClosedCases = await Conversation.countDocuments({
      assignedTo: lawyerId,
      status: { $in: ['completed', 'abandoned', 'resolved_by_ai'] },
      closedAt: { $gte: thirtyDaysAgo },
    });

    return {
      totalCases,
      openCases,
      closedCases,
      assignedCases,
      availableCases,
      recentClosedCases,
      successRate:
        totalCases > 0 ? Math.round((closedCases / totalCases) * 100) : 0,
    };
  }

  // Lista de advogados disponíveis para transferência
  @Get('available-lawyers')
  @Permissions('view_lawyer_list')
  getAvailableLawyers(@Request() _req: { user: JwtPayload }) {
    // Buscar usuários com role 'lawyer' ou 'super_admin'
    // Nota: Esta implementação assume que existe um modelo User
    // Por enquanto, retorna lista vazia - será implementado quando o modelo User estiver disponível
    return [];
  }
}
