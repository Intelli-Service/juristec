import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../lib/audit.service';
import { AuditAction, AuditSeverity } from '../models/AuditLog';

@Injectable()
export class AuditMiddleware implements NestMiddleware {
  constructor(private auditService: AuditService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const userId = (req as any).user?.id;
    const ipAddress = this.getClientIP(req);
    const userAgent = req.get('User-Agent') || 'unknown';

    // Captura a resposta original
    const originalSend = res.send;
    let responseBody: any = null;
    let responseStatus = 200;

    res.send = function (body) {
      responseBody = body;
      return originalSend.call(this, body);
    };

    // Intercepta o status da resposta
    const originalStatus = res.status;
    res.status = function (code) {
      responseStatus = code;
      return originalStatus.call(this, code);
    };

    // Registra quando a resposta termina
    res.on('finish', () => {
      this.logAuditAsync(
        startTime,
        userId,
        ipAddress,
        userAgent,
        req,
        res,
        responseBody,
        responseStatus,
      );
    });

    next();
  }

  private async logAuditAsync(
    startTime: number,
    userId: string | undefined,
    ipAddress: string,
    userAgent: string,
    req: Request,
    res: Response,
    responseBody: any,
    responseStatus: number,
  ) {
    try {
      const duration = Date.now() - startTime;
      const method = req.method;
      const url = req.originalUrl;
      const resource = this.extractResource(url);

      // Determina severidade baseada no status e método
      let severity = AuditSeverity.LOW;
      if (responseStatus >= 400) {
        severity =
          responseStatus >= 500 ? AuditSeverity.HIGH : AuditSeverity.MEDIUM;
      } else if (method === 'DELETE' || this.isSensitiveEndpoint(url)) {
        severity = AuditSeverity.MEDIUM;
      }

      // Mapeia método HTTP para ação de auditoria
      const action = this.mapHttpMethodToAction(method);

      await this.auditService.log(
        action,
        resource,
        {
          method,
          url,
          statusCode: responseStatus,
          duration,
          userAgent,
          requestSize: JSON.stringify(req.body || {}).length,
          responseSize: responseBody ? JSON.stringify(responseBody).length : 0,
        },
        {
          userId,
          severity,
          ipAddress,
          userAgent,
          success: responseStatus < 400,
          errorMessage:
            responseStatus >= 400 ? `HTTP ${responseStatus}` : undefined,
        },
      );
    } catch (error) {
      console.error('Erro no middleware de auditoria:', error);
    }
  }

  private getClientIP(req: Request): string {
    // Tenta várias fontes para obter o IP real do cliente
    return (
      (req.headers['x-forwarded-for'] as string) ||
      (req.headers['x-real-ip'] as string) ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    )
      .split(',')[0]
      .trim();
  }

  private extractResource(url: string): string {
    // Extrai o recurso da URL (ex: /api/users/123 -> users)
    const parts = url.split('/').filter((part) => part && !part.match(/^\d+$/));
    return parts.length > 1 ? parts[1] : 'api';
  }

  private isSensitiveEndpoint(url: string): boolean {
    const sensitivePatterns = [
      /\/auth\//,
      /\/admin\//,
      /\/users\/.*\/password/,
      /\/consent\//,
      /\/data-subject/,
      /\/audit/,
    ];

    return sensitivePatterns.some((pattern) => pattern.test(url));
  }

  private mapHttpMethodToAction(method: string): AuditAction {
    switch (method.toUpperCase()) {
      case 'GET':
        return AuditAction.DATA_ACCESS;
      case 'POST':
        return AuditAction.USER_CREATE;
      case 'PUT':
      case 'PATCH':
        return AuditAction.USER_UPDATE;
      case 'DELETE':
        return AuditAction.USER_DELETE;
      default:
        return AuditAction.DATA_ACCESS;
    }
  }
}
