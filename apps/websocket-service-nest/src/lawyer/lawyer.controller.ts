import { Controller, Get, Post, Put, Param, UseGuards, Request, Body } from '@nestjs/common';
import { AIService } from '../lib/ai.service';
import Conversation from '../models/Conversation';
import Message from '../models/Message';
import { NextAuthGuard, Roles, Permissions, JwtPayload } from '../guards/nextauth.guard';

@Controller('lawyer')
@UseGuards(NextAuthGuard)
@Roles('lawyer', 'super_admin')
export class LawyerController {
  constructor(private aiService: AIService) {}

  // Dashboard do advogado - ver casos disponíveis e atribuídos
  @Get('cases')
  @Permissions('view_available_cases', 'view_all_cases')
  async getMyCases(@Request() req: { user: JwtPayload }) {
    console.log('[DEBUG] LawyerController.getMyCases - Request user:', req.user);
    const lawyerId = req.user.userId;
    return this.aiService.getCasesForLawyer(lawyerId);
  }

  // Pegar um caso
  @Post('cases/:roomId/assign')
  @Permissions('assign_cases_to_self', 'assign_cases')
  async assignCase(@Param('roomId') roomId: string, @Request() req: { user: JwtPayload }) {
    const lawyerId = req.user.userId;
    return this.aiService.assignCase(roomId, lawyerId);
  }

  // Ver mensagens de um caso específico
  @Get('cases/:roomId/messages')
  @Permissions('access_assigned_chats', 'access_client_chat')
  async getCaseMessages(@Param('roomId') roomId: string, @Request() req: { user: JwtPayload }) {
    const conversation = await Conversation.findOne({ roomId });
    if (!conversation) {
      throw new Error('Caso não encontrado');
    }

    // Check if lawyer has access to this case
    if (req.user.role === 'lawyer' && conversation.assignedTo !== req.user.userId) {
      throw new Error('Acesso negado a este caso');
    }

    return Message.find({ conversationId: conversation._id }).sort({ createdAt: 1 });
  }

  // Atualizar status do caso
  @Put('cases/:roomId/status')
  @Permissions('update_case_status')
  async updateCaseStatus(
    @Param('roomId') roomId: string,
    @Body('status') status: string,
    @Request() req: { user: JwtPayload }
  ) {
    const conversation = await Conversation.findOne({ roomId });
    if (!conversation) {
      throw new Error('Caso não encontrado');
    }

    // Check if lawyer has access to this case
    if (req.user.role === 'lawyer' && conversation.assignedTo !== req.user.userId) {
      throw new Error('Acesso negado a este caso');
    }

    return Conversation.findOneAndUpdate(
      { roomId },
      { status, updatedAt: new Date() },
      { new: true }
    );
  }
}