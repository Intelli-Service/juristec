import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.NEXTAUTH_SECRET || 'fallback-secret',
      passReqToCallback: true, // Pass request to validate method
    });
  }

  async validate(request: any, payload: any) {
    console.log('[DEBUG] JWT Strategy - Raw token from request:', request.headers.authorization);
    console.log('[DEBUG] JWT Strategy - Decoded payload:', payload);

    // If payload looks like NextAuth JWE structure, try to decrypt it
    if (payload.alg === 'dir' && payload.enc) {
      console.log('[DEBUG] Detected JWE token, attempting decryption...');
      try {
        const { jwtDecrypt } = await import('jose');
        const crypto = await import('crypto');
        if (!globalThis.crypto) {
          globalThis.crypto = crypto.webcrypto as any;
        }

        const key = new TextEncoder().encode((process.env.NEXTAUTH_SECRET || 'fallback-secret').slice(0, 30));
        const { payload: decryptedPayload } = await jwtDecrypt(payload, key);

        console.log('[DEBUG] JWE decrypted successfully, payload:', decryptedPayload);
        return {
          userId: decryptedPayload.userId || decryptedPayload.sub,
          email: decryptedPayload.email,
          role: decryptedPayload.role,
          permissions: decryptedPayload.permissions || []
        };
      } catch (jweError) {
        console.log('[DEBUG] JWE decryption failed:', jweError.message);
        throw new UnauthorizedException('Invalid JWE token');
      }
    }

    // Regular JWT validation
    return {
      userId: payload.sub || payload.userId,
      email: payload.email,
      role: payload.role,
      permissions: payload.permissions || []
    };
  }
}