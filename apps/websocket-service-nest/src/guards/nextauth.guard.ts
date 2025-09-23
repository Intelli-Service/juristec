import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SetMetadata } from '@nestjs/common';

export interface JwtPayload {
  userId: string;
  role: string;
  permissions: string[];
  email: string;
  name: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class NextAuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Try to extract and validate JWT from NextAuth session cookie
    const payload = await this.extractNextAuthToken(request);

    if (!payload) {
      throw new UnauthorizedException('Access token not found');
    }

    try {
      request.user = payload;

      // Check required roles if specified
      const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
      if (requiredRoles && !requiredRoles.includes(payload.role)) {
        throw new ForbiddenException('Insufficient role permissions');
      }

      // Check required permissions if specified
      const requiredPermissions = this.reflector.get<string[]>('permissions', context.getHandler());
      if (requiredPermissions) {
        const hasPermission = requiredPermissions.some(permission =>
          payload.permissions.includes(permission)
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

  private async extractNextAuthToken(request: any): Promise<JwtPayload | null> {
    try {
      // Try Authorization header first (for API calls)
      const authHeader = request.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        return await this.decryptNextAuthJWE(token);
      }

      // Try to extract from NextAuth session cookie
      const cookies = request.headers.cookie;
      if (cookies) {
        const sessionCookie = this.parseCookie(cookies, 'next-auth.session-token') ||
                             this.parseCookie(cookies, '__Secure-next-auth.session-token');

        if (sessionCookie) {
          return await this.decryptNextAuthJWE(sessionCookie);
        }
      }

      return null;
    } catch (error) {
      console.error('Error extracting NextAuth token:', error);
      return null;
    }
  }

  private async decryptNextAuthJWE(jweToken: string): Promise<JwtPayload | null> {
    try {
      // Try JWT first (if NextAuth is configured to use simple JWT)
      try {
        const { default: jwt } = await import('jsonwebtoken');
        const decoded = jwt.verify(jweToken, process.env.NEXTAUTH_SECRET!) as any;
        return {
          userId: decoded.userId || decoded.sub,
          role: decoded.role,
          permissions: decoded.permissions || [],
          email: decoded.email,
          name: decoded.name,
          iat: decoded.iat,
          exp: decoded.exp
        };
      } catch (jwtError) {
        // If JWT fails, try JWE
        console.log('JWT verification failed, trying JWE...');
      }

      // Fallback to JWE decryption
      const { jwtDecrypt } = await import('jose');

      // Use Node.js crypto module
      const crypto = await import('crypto');
      if (!globalThis.crypto) {
        globalThis.crypto = crypto.webcrypto as any;
      }

      const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);

      const { payload } = await jwtDecrypt(jweToken, secret);

      // Convert the payload to our JwtPayload format
      // NextAuth stores user data directly in the payload
      const sessionData = payload as any;

      return {
        userId: sessionData.userId || sessionData.sub,
        role: sessionData.role,
        permissions: sessionData.permissions || [],
        email: sessionData.email,
        name: sessionData.name,
        iat: sessionData.iat,
        exp: sessionData.exp
      };
    } catch (error) {
      console.error('Error decrypting/verifying token:', error);
      return null;
    }
  }  private parseCookie(cookieHeader: string, name: string): string | undefined {
    const cookies = cookieHeader.split(';').map(c => c.trim());
    const cookie = cookies.find(c => c.startsWith(`${name}=`));
    return cookie ? decodeURIComponent(cookie.substring(name.length + 1)) : undefined;
  }
}

// Decorators for setting metadata
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
export const Permissions = (...permissions: string[]) => SetMetadata('permissions', permissions);