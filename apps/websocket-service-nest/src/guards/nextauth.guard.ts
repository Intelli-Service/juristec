import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SetMetadata } from '@nestjs/common';
import { Request } from 'express';

export interface JwtPayload {
  userId: string;
  role: string;
  permissions: string[];
  email: string;
  name: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

export interface WebSocketRequest {
  handshake?: {
    auth?: {
      token?: string;
    };
  };
  headers?: {
    authorization?: string;
    cookie?: string;
  };
}

type RequestWithAuth = Request | WebSocketRequest;

@Injectable()
export class NextAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const token = this.extractTokenFromRequest(request);
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const payload = await this.validateToken(token);
      request.user = payload;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromRequest(request: RequestWithAuth): string | null {
    // Try Authorization header first (HTTP requests)
    const authHeader = request.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try WebSocket auth token
    const wsRequest = request as WebSocketRequest;
    if (wsRequest.handshake?.auth?.token) {
      return wsRequest.handshake.auth.token;
    }

    // Try cookies (HTTP requests)
    const cookies = request.headers?.cookie;
    if (cookies) {
      const sessionCookie = this.parseCookie(
        cookies,
        'next-auth.session-token',
      );
      if (sessionCookie) {
        return sessionCookie;
      }
    }

    return null;
  }

  private async validateToken(token: string): Promise<JwtPayload> {
    try {
      // Verificar JWT diretamente
      const payload = this.jwtService.verify(token, {
        secret: process.env.NEXTAUTH_SECRET || 'fallback-secret',
      });

      return {
        userId: payload.sub || payload.userId,
        role: payload.role,
        permissions: payload.permissions || [],
        email: payload.email,
        name: payload.name,
        iat: payload.iat,
        exp: payload.exp,
      };
    } catch (error) {
      throw error;
    }
  }

  private parseCookie(cookieHeader: string, name: string): string | undefined {
    const cookies = cookieHeader.split(';').map((c) => c.trim());
    const cookie = cookies.find((c) => c.startsWith(`${name}=`));
    return cookie
      ? decodeURIComponent(cookie.substring(name.length + 1))
      : undefined;
  }
}

// Decorators for setting metadata
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
export const Permissions = (...permissions: string[]) =>
  SetMetadata('permissions', permissions);
