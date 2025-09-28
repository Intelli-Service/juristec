import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';

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

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Access token not found');
    }

    try {
      const payload = jwt.verify(
        token,
        process.env.NEXTAUTH_SECRET!,
      ) as JwtPayload;
      request.user = payload;

      // Check required roles if specified
      const requiredRoles = this.reflector.get<string[]>(
        'roles',
        context.getHandler(),
      );
      if (requiredRoles && !requiredRoles.includes(payload.role)) {
        throw new ForbiddenException('Insufficient role permissions');
      }

      // Check required permissions if specified
      const requiredPermissions = this.reflector.get<string[]>(
        'permissions',
        context.getHandler(),
      );
      if (requiredPermissions) {
        const hasPermission = requiredPermissions.some((permission) =>
          payload.permissions.includes(permission),
        );
        if (!hasPermission) {
          throw new ForbiddenException('Insufficient permissions');
        }
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    // Try Authorization header first (existing behavior)
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (type === 'Bearer' && token) {
      return token;
    }

    // Try NextAuth cookies (new: cookie extraction)
    const cookies = request.headers.cookie;
    if (cookies) {
      const sessionCookie = this.parseCookie(cookies, 'next-auth.session-token');
      if (sessionCookie) {
        return sessionCookie;
      }
      
      // Try secure cookie variant for HTTPS
      const secureSessionCookie = this.parseCookie(cookies, '__Secure-next-auth.session-token');
      if (secureSessionCookie) {
        return secureSessionCookie;
      }
    }

    return undefined;
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
import { SetMetadata } from '@nestjs/common';

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
export const Permissions = (...permissions: string[]) =>
  SetMetadata('permissions', permissions);
