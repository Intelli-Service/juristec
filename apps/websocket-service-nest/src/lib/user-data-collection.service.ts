import { Injectable } from '@nestjs/common';
import { AIService } from './ai.service';

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

@Injectable()
export class UserDataCollectionService {
  private static readonly EMAIL_REGEX =
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  private static readonly PHONE_REGEX = /(\(?\d{2}\)?\s?)?\d{4,5}-?\d{4}/g;
  private static readonly MINIMUM_MESSAGES_BEFORE_CONTACT_REQUEST = 3;
  private static readonly CONTACT_REQUEST_MESSAGE = `Para te ajudar melhor e manter seu histórico de conversas seguro, poderia me informar seu email ou WhatsApp? Assim posso garantir que você tenha acesso às suas conversas em outros dispositivos e receber notificações importantes sobre seu caso.`;

  constructor(private readonly aiService: AIService) {}

  /**
   * Extrai informações de contato de uma mensagem do usuário
   */
  extractContactInfo(message: string): ContactInfo {
    const emails = message.match(UserDataCollectionService.EMAIL_REGEX);
    const phones = message.match(UserDataCollectionService.PHONE_REGEX);

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
    return (
      messageCount >=
      UserDataCollectionService.MINIMUM_MESSAGES_BEFORE_CONTACT_REQUEST
    );
  }

  /**
   * Gera mensagem solicitando informações de contato
   */
  generateContactRequest(): string {
    return UserDataCollectionService.CONTACT_REQUEST_MESSAGE;
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
      await this.aiService.updateUserData(conversationId, {
        email: contactInfo.email || userData.email,
        phone: contactInfo.phone || userData.phone,
      });

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
