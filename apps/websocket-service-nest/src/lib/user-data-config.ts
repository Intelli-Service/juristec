/**
 * Configuração centralizada para o serviço de coleta de dados do usuário
 * Permite ajustar parâmetros sem rebuild da aplicação
 */

export interface UserDataConfig {
  /** Número mínimo de mensagens antes de solicitar contato */
  minMessagesBeforeRequest: number;

  /** Regex para validação de email */
  emailRegex: RegExp;

  /** Regex para validação de telefone */
  phoneRegex: RegExp;

  /** Mensagens do sistema */
  messages: {
    /** Mensagem solicitando informações de contato */
    contactRequest: string;
  };
}

/**
 * Configuração padrão do sistema
 * Pode ser sobrescrita por variáveis de ambiente ou configuração externa
 */
export const DEFAULT_USER_DATA_CONFIG: UserDataConfig = {
  minMessagesBeforeRequest: parseInt(
    process.env.USER_DATA_MIN_MESSAGES_BEFORE_REQUEST || '3',
    10,
  ),

  emailRegex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,

  phoneRegex: /(\(?\d{2}\)?\s?)?\d{4,5}-?\d{4}/g,

  messages: {
    contactRequest: process.env.USER_DATA_CONTACT_REQUEST_MESSAGE ||
      `Para te ajudar melhor e manter seu histórico de conversas seguro, poderia me informar seu email ou WhatsApp? Assim posso garantir que você tenha acesso às suas conversas em outros dispositivos e receber notificações importantes sobre seu caso.`,
  },
};

/**
 * Classe para gerenciar configuração do UserDataCollectionService
 */
export class UserDataConfigManager {
  private static instance: UserDataConfigManager;
  private config: UserDataConfig;

  private constructor() {
    this.config = { ...DEFAULT_USER_DATA_CONFIG };
  }

  static getInstance(): UserDataConfigManager {
    if (!UserDataConfigManager.instance) {
      UserDataConfigManager.instance = new UserDataConfigManager();
    }
    return UserDataConfigManager.instance;
  }

  getConfig(): UserDataConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<UserDataConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  resetToDefaults(): void {
    this.config = { ...DEFAULT_USER_DATA_CONFIG };
  }
}