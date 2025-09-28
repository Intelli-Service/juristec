import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';

@Injectable()
export class TokenValidationService {
  constructor(private readonly jwtService: JwtService) {}

  /**
   * Valida um token CSRF do NextAuth
   * Formato esperado: token|hash
   */
  validateCSRFToken(csrfToken: string): { valid: boolean; token?: string; error?: string } {
    try {
      const [token, providedHash] = csrfToken.split('|');

      if (!token || !providedHash) {
        return { valid: false, error: 'Formato inválido - esperado token|hash' };
      }

      // Recalcula o hash esperado usando a mesma chave secreta do NextAuth
      const secret = process.env.NEXTAUTH_SECRET || 'juristec_auth_key_2025_32bytes_';
      const expectedHash = crypto.createHash('sha256')
        .update(token + secret)
        .digest('hex');

      if (providedHash !== expectedHash) {
        return { valid: false, error: 'Assinatura inválida' };
      }

      return { valid: true, token };
    } catch (error) {
      return { valid: false, error: `Erro na validação: ${error.message}` };
    }
  }

  /**
   * Valida um token JWT de sessão do NextAuth
   */
  validateSessionToken(sessionToken: string): { valid: boolean; payload?: any; error?: string } {
    try {
      const secret = process.env.NEXTAUTH_SECRET || 'juristec_auth_key_2025_32bytes_';
      const payload = this.jwtService.verify(sessionToken, { secret });

      return { valid: true, payload };
    } catch (error) {
      return { valid: false, error: `Token JWT inválido: ${error.message}` };
    }
  }

  /**
   * Gera um userId consistente a partir de um token CSRF
   * Usa SHA-256 do primeiro token para garantir consistência
   */
  generateUserIdFromCSRF(csrfToken: string): string {
    const validation = this.validateCSRFToken(csrfToken);
    if (!validation.valid) {
      throw new Error(`Token CSRF inválido: ${validation.error}`);
    }

    const [token] = csrfToken.split('|');
    return crypto.createHash('sha256')
      .update(token)
      .digest('hex')
      .substring(0, 16); // 16 caracteres para userId
  }

  /**
   * Estratégia unificada para extrair userId de qualquer tipo de token
   * Prioriza: JWT de sessão > Token CSRF
   */
  extractUserId(tokens: { sessionToken?: string; csrfToken?: string }): {
    userId: string;
    isAuthenticated: boolean;
    user?: any;
    error?: string;
  } {
    // Primeiro tenta validar token de sessão (usuário autenticado)
    if (tokens.sessionToken) {
      const sessionValidation = this.validateSessionToken(tokens.sessionToken);
      if (sessionValidation.valid) {
        return {
          userId: sessionValidation.payload.userId,
          isAuthenticated: true,
          user: sessionValidation.payload,
        };
      }
    }

    // Se não há token de sessão válido, tenta token CSRF (usuário anônimo)
    if (tokens.csrfToken) {
      try {
        const userId = this.generateUserIdFromCSRF(tokens.csrfToken);
        return {
          userId,
          isAuthenticated: false,
        };
      } catch (error) {
        return {
          userId: '',
          isAuthenticated: false,
          error: `Token CSRF inválido: ${error.message}`,
        };
      }
    }

    // Nenhum token válido encontrado
    return {
      userId: '',
      isAuthenticated: false,
      error: 'Nenhum token válido fornecido',
    };
  }

  /**
   * Valida tokens de uma conexão WebSocket
   * Extrai tokens dos headers de handshake
   */
  validateWebSocketTokens(handshake: any): {
    userId: string;
    isAuthenticated: boolean;
    user?: any;
    error?: string;
  } {
    // Extrair tokens do handshake
    const sessionToken = handshake.auth?.token ||
                        handshake.headers?.authorization?.split(' ')[1];

    const csrfToken = handshake.auth?.csrfToken ||
                     handshake.headers?.['x-csrf-token'] ||
                     handshake.query?.csrfToken;

    return this.extractUserId({ sessionToken, csrfToken });
  }
}