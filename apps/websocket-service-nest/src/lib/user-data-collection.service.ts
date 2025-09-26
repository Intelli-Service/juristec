import { Injectable } from '@nestjs/common';
import { AIService } from './ai.service';
import { UserDataConfigManager, UserDataConfig } from './user-data-config';

export interface ContactInfo {
  email: string | null;
  phone: string | null;
}

export interface UserData {
  email: string | null;
  phone: string | null;
  name?: string;
  conversationCount: number;
}

export interface ConversationUpdateData {
  userEmail?: string | null;
  userPhone?: string | null;
  userName?: string;
}

@Injectable()
export class UserDataCollectionService {
  private configManager: UserDataConfigManager;

  constructor(private readonly aiService: AIService) {
    this.configManager = UserDataConfigManager.getInstance();
  }

  private getConfig(): UserDataConfig {
    return this.configManager.getConfig();
  }

  /**
   * Extrai informações de contato de uma mensagem do usuário
   */
  extractContactInfo(message: string): ContactInfo {
    const config = this.getConfig();
    const emails = message.match(config.emailRegex);
    const phones = message.match(config.phoneRegex);

    return {
      email: emails ? emails[0] : null,
      phone: phones ? phones[0] : null,
    };
  }

  /**
   * Verifica se deve solicitar informações de contato do usuário
   */
  shouldCollectContactInfo(userData: UserData, messageCount: number): boolean {
    // Não coletar se já tem dados de contato
    if (userData.email || userData.phone) {
      return false;
    }

    // Só coletar após algumas mensagens para não ser invasivo
    const config = this.getConfig();
    return messageCount >= config.minMessagesBeforeRequest;
  }

  /**
   * Gera mensagem solicitando informações de contato
   */
  generateContactRequest(): string {
    const config = this.getConfig();
    return config.messages.contactRequest;
  }

  /**
   * Processa mensagem do usuário e coleta dados se necessário
   */
  async processUserMessage(
    message: string,
    userData: UserData,
    conversationId: string,
  ): Promise<{
    shouldRequestContact: boolean;
    contactRequestMessage?: string;
  }> {
    const messageCount = userData.conversationCount + 1;

    // Extrair informações de contato da mensagem atual
    const contactInfo = this.extractContactInfo(message);

    // Se encontrou dados de contato, atualizar
    if (contactInfo.email || contactInfo.phone) {
      const updateData: {
        email?: string | null;
        phone?: string | null;
        name?: string;
      } = {
        email: contactInfo.email || userData.email,
        phone: contactInfo.phone || userData.phone,
      };

      await this.aiService.updateUserData(conversationId, updateData);

      return { shouldRequestContact: false };
    }

    // Verificar se deve solicitar contato
    const shouldRequest = this.shouldCollectContactInfo(userData, messageCount);

    if (shouldRequest) {
      return {
        shouldRequestContact: true,
        contactRequestMessage: this.generateContactRequest(),
      };
    }

    return { shouldRequestContact: false };
  }
}
