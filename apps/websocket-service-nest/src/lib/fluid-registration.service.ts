import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VerificationService } from './verification.service';
import { IUser, UserRole } from '../models/User';

export interface FluidRegistrationResult {
  success: boolean;
  message: string;
  userCreated?: boolean;
  verificationSent?: boolean;
  needsVerification?: boolean;
  userId?: string;
}

export interface ContactInfo {
  email?: string;
  phone?: string;
  name?: string;
}

@Injectable()
export class FluidRegistrationService {
  constructor(
    @InjectModel('User') private userModel: Model<IUser>,
    @InjectModel('Conversation') private conversationModel: Model<any>,
    private readonly verificationService: VerificationService,
  ) {}

  /**
   * Processa cadastro fluido baseado na conversa
   */
  async processFluidRegistration(
    contactInfo: ContactInfo,
    conversationId: string,
  ): Promise<FluidRegistrationResult> {
    try {
      // Verificar se já existe usuário com este contato
      const existingUser = await this.findUserByContact(contactInfo);

      if (existingUser) {
        // Usuário existe - verificar se já verificado
        const isVerified =
          await this.verificationService.isVerified(contactInfo);

        if (isVerified) {
          // Já verificado - conectar automaticamente
          await this.linkConversationToUser(
            conversationId,
            existingUser._id.toString(),
          );
          return {
            success: true,
            message: 'Conta encontrada e conectada automaticamente.',
            userId: existingUser._id.toString(),
          };
        } else {
          // Existe mas não verificado - enviar código de verificação
          const code = await this.verificationService.generateCode(contactInfo);
          this.sendVerificationCode(contactInfo, code);

          return {
            success: true,
            message:
              'Enviamos um código de verificação. Por favor, informe o código para confirmar.',
            verificationSent: true,
            needsVerification: true,
          };
        }
      } else {
        // Usuário não existe - criar conta temporária e enviar verificação
        const tempUser = await this.createTemporaryUser(contactInfo);
        const code = await this.verificationService.generateCode(contactInfo);
        this.sendVerificationCode(contactInfo, code);

        // Vincular conversa temporariamente
        await this.linkConversationToUser(
          conversationId,
          tempUser._id.toString(),
        );

        return {
          success: true,
          message:
            'Criamos sua conta automaticamente. Enviamos um código de verificação para confirmar.',
          userCreated: true,
          verificationSent: true,
          needsVerification: true,
          userId: tempUser._id.toString(),
        };
      }
    } catch (error) {
      console.error('Erro no cadastro fluido:', error);
      return {
        success: false,
        message: 'Erro ao processar cadastro. Tente novamente.',
      };
    }
  }

  /**
   * Verifica código de confirmação e finaliza cadastro
   */
  async verifyAndCompleteRegistration(
    contactInfo: ContactInfo,
    code: string,
    conversationId: string,
  ): Promise<FluidRegistrationResult> {
    try {
      const isValid = await this.verificationService.verifyCode(
        contactInfo,
        code,
      );

      if (!isValid) {
        return {
          success: false,
          message: 'Código inválido ou expirado. Tente novamente.',
        };
      }

      // Buscar usuário temporário ou existente
      const user = await this.findUserByContact(contactInfo);

      if (!user) {
        return {
          success: false,
          message: 'Usuário não encontrado. Tente o cadastro novamente.',
        };
      }

      // Ativar usuário se estiver temporário
      if (!user.isActive) {
        user.isActive = true;
        await user.save();
      }

      // Vincular conversa permanentemente
      await this.linkConversationToUser(conversationId, user._id.toString());

      return {
        success: true,
        message:
          'Conta verificada com sucesso! Agora você pode acessar seu histórico em qualquer dispositivo.',
        userId: user._id.toString(),
      };
    } catch (error) {
      console.error('Erro na verificação:', error);
      return {
        success: false,
        message: 'Erro ao verificar código. Tente novamente.',
      };
    }
  }

  /**
   * Busca usuário por email ou telefone
   */
  private async findUserByContact(
    contactInfo: ContactInfo,
  ): Promise<IUser | null> {
    const query: any = {};

    if (contactInfo.email) {
      query.email = contactInfo.email.toLowerCase();
    }

    if (contactInfo.phone) {
      query['profile.phone'] = contactInfo.phone;
    }

    return await this.userModel.findOne(query);
  }

  /**
   * Cria usuário temporário (inativo) até verificação
   */
  private async createTemporaryUser(contactInfo: ContactInfo): Promise<IUser> {
    const tempPassword = Math.random().toString(36).slice(-12);
    const userName = contactInfo.name || `Usuário ${Date.now()}`;

    const userData = {
      email: contactInfo.email?.toLowerCase(),
      password: tempPassword, // Será alterada após verificação
      name: userName,
      role: UserRole.CLIENT,
      isActive: false, // Temporário até verificação
      permissions: [],
      profile: {
        phone: contactInfo.phone,
      },
      assignedCases: [],
    };

    const user = new this.userModel(userData);
    return await user.save();
  }

  /**
   * Vincula conversa a um usuário
   */
  private async linkConversationToUser(
    conversationId: string,
    userId: string,
  ): Promise<void> {
    await this.conversationModel.findByIdAndUpdate(conversationId, {
      'clientInfo.userId': userId,
      updatedAt: new Date(),
    });
  }

  /**
   * Envia código de verificação (simulado - implementar email/SMS real)
   */
  private sendVerificationCode(contactInfo: ContactInfo, code: string): void {
    if (contactInfo.email) {
      // TODO: Implementar envio real por email
    }

    if (contactInfo.phone) {
      // TODO: Implementar envio real por SMS
    }
  }

  /**
   * Gera roomId consistente baseado em contato verificado
   */
  generateConsistentRoomId(contactInfo: ContactInfo): string | null {
    if (contactInfo.email) {
      return `user-${contactInfo.email.toLowerCase()}`;
    }

    if (contactInfo.phone) {
      return `user-${contactInfo.phone}`;
    }

    return null;
  }
}
