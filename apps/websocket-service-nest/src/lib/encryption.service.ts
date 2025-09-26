import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly tagLength = 16; // 128 bits
  private readonly masterKey: string;

  constructor() {
    this.masterKey =
      process.env.ENCRYPTION_MASTER_KEY ||
      'default-juristec-key-change-in-production';
    if (this.masterKey === 'default-juristec-key-change-in-production') {
      console.warn(
        'WARNING: Using default encryption key. Set ENCRYPTION_MASTER_KEY environment variable.',
      );
    }
  }

  /**
   * Gera uma chave de criptografia baseada na chave mestre do ambiente
   */
  private getEncryptionKey(): Buffer {
    // Deriva uma chave de 256 bits da chave mestre usando PBKDF2
    return crypto.pbkdf2Sync(
      this.masterKey,
      'juristec-lgpd-salt',
      100000,
      this.keyLength,
      'sha256',
    );
  }

  /**
   * Criptografa dados sensíveis
   */
  encrypt(data: string): string {
    try {
      const key = this.getEncryptionKey();
      const iv = crypto.randomBytes(this.ivLength);

      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      cipher.setAAD(Buffer.from('juristec-data')); // Additional Authenticated Data

      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      // Formato: iv:authTag:encryptedData
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      throw new Error(`Erro ao criptografar dados: ${error.message}`);
    }
  }

  /**
   * Descriptografa dados sensíveis
   */
  decrypt(encryptedData: string): string {
    try {
      const key = this.getEncryptionKey();
      const parts = encryptedData.split(':');

      if (parts.length !== 3) {
        throw new Error('Formato de dados criptografados inválido');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];

      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAAD(Buffer.from('juristec-data'));
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Erro ao descriptografar dados: ${error.message}`);
    }
  }

  /**
   * Gera um hash irreversível para dados (ex: senhas)
   */
  hash(data: string): string {
    try {
      return crypto.createHash('sha256').update(data).digest('hex');
    } catch (error) {
      throw new Error(`Erro ao gerar hash: ${error.message}`);
    }
  }

  /**
   * Gera um token seguro para verificações
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Criptografa dados pessoais (LGPD compliance)
   */
  encryptPersonalData(data: Record<string, any>): Record<string, any> {
    const sensitiveFields = [
      'email',
      'phone',
      'cpf',
      'rg',
      'address',
      'bankAccount',
      'creditCard',
      'socialSecurity',
    ];

    const encrypted = { ...data };

    for (const field of sensitiveFields) {
      if (encrypted[field]) {
        encrypted[field] = this.encrypt(String(encrypted[field]));
        encrypted[`${field}_encrypted`] = true;
      }
    }

    return encrypted;
  }

  /**
   * Descriptografa dados pessoais
   */
  decryptPersonalData(data: Record<string, any>): Record<string, any> {
    const decrypted = { ...data };

    for (const [key] of Object.entries(decrypted)) {
      if (key.endsWith('_encrypted') && decrypted[key] === true) {
        const fieldName = key.replace('_encrypted', '');
        if (decrypted[fieldName]) {
          decrypted[fieldName] = this.decrypt(String(decrypted[fieldName]));
        }
        delete decrypted[key];
      }
    }

    return decrypted;
  }
}
