import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AIService } from '../lib/ai.service';
import User, { UserRole } from '../models/User';
import Conversation from '../models/Conversation';
import {
  NextAuthGuard,
  Roles,
  Permissions,
  JwtPayload,
} from '../guards/nextauth.guard';

@Controller('admin')
export class AdminController {
  constructor(private aiService: AIService) {}

  @UseGuards(NextAuthGuard)
  @Roles('super_admin', 'moderator')
  @Get('ai-config')
  @Permissions('manage_ai_config')
  async getAIConfig() {
    return this.aiService.getCurrentConfig();
  }

  @UseGuards(NextAuthGuard)
  @Roles('super_admin', 'moderator')
  @Put('ai-config')
  @Permissions('manage_ai_config')
  async updateAIConfig(
    @Body() updates: any,
    @Request() req: { user: JwtPayload },
  ) {
    return this.aiService.updateConfig(updates, req.user.userId);
  }

  // Gestão de usuários
  @UseGuards(NextAuthGuard)
  @Roles('super_admin')
  @Get('users')
  @Permissions('manage_users')
  async getUsers() {
    return User.find().select('-password');
  }

  @UseGuards(NextAuthGuard)
  @Roles('super_admin')
  @Post('users')
  @Permissions('manage_users')
  async createUser(
    @Body() userData: any,
    @Request() _req: { user: JwtPayload },
  ) {
    const user = new User(userData);
    return user.save();
  }

  @UseGuards(NextAuthGuard)
  @Roles('super_admin')
  @Put('users/:id')
  @Permissions('manage_users')
  async updateUser(
    @Param('id') id: string,
    @Body() updates: any,
    @Request() _req: { user: JwtPayload },
  ) {
    return User.findByIdAndUpdate(id, updates, { new: true }).select(
      '-password',
    );
  }

  @UseGuards(NextAuthGuard)
  @Roles('super_admin')
  @Delete('users/:id')
  @Permissions('manage_users')
  async deleteUser(
    @Param('id') id: string,
    @Request() _req: { user: JwtPayload },
  ) {
    return User.findByIdAndDelete(id);
  }

  // Gestão de casos
  @Get('cases')
  @Permissions('view_all_cases')
  async getCases() {
    return Conversation.find().sort({ createdAt: -1 });
  }

  @Get('cases/:id')
  @Permissions('view_all_cases')
  async getCase(@Param('id') id: string) {
    return Conversation.findById(id);
  }

  @Put('cases/:id/assign')
  @Permissions('assign_cases')
  async assignCase(
    @Param('id') id: string,
    @Body() { lawyerId }: { lawyerId: string },
  ) {
    // TODO: Implementar lógica de atribuição de caso
    return Conversation.findByIdAndUpdate(
      id,
      { assignedTo: lawyerId },
      { new: true },
    );
  }

  @Get('lawyers')
  @Permissions('view_all_cases')
  async getLawyers() {
    return User.find({ role: UserRole.LAWYER }).select('-password');
  }

  @Get('moderators')
  @Permissions('manage_users')
  async getModerators() {
    return User.find({ role: UserRole.MODERATOR }).select('-password');
  }
}
