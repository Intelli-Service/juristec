import { Controller, Get } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';

@Controller('test')
export class TestController {
  constructor(private readonly jwtService: JwtService) {}

  @Get('anonymous-login')
  async getAnonymousToken() {
    try {
      // Criar um usuário anônimo
      const anonymousId = `anon_${crypto.randomBytes(16).toString('hex')}`;

      // Criar token JWT com o mesmo secret do NextAuth
      const token = this.jwtService.sign(
        {
          userId: anonymousId,
          email: `${anonymousId}@anonymous.juristec`,
          role: 'client',
          permissions: ['access_own_chat'],
          isAnonymous: true,
        },
        {
          secret:
            process.env.NEXTAUTH_SECRET || 'juristec_auth_key_2025_32bytes_',
        },
      );

      return {
        success: true,
        token,
        session: {
          userId: anonymousId,
          isAnonymous: true,
          role: 'client',
        },
      };
    } catch (error) {
      console.error('Erro ao gerar token anônimo:', error);
      return {
        success: false,
        error: 'Erro interno do servidor',
      };
    }
  }
}
