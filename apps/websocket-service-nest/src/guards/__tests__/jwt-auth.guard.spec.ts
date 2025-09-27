import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import {
  JwtAuthGuard,
  JwtPayload,
  Roles,
  Permissions,
} from '../jwt-auth.guard';
import {
  UnauthorizedException,
  ForbiddenException,
  ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken');
const mockedJwt = jest.mocked(jwt);

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: any;
  let mockExecutionContext: ExecutionContext;
  let mockRequest: any;

  const validToken = 'valid-jwt-token';
  const mockJwtPayload: JwtPayload = {
    userId: 'user-123',
    role: 'client',
    permissions: ['read_conversations', 'create_messages'],
    email: 'user@example.com',
    name: 'John Doe',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  beforeEach(async () => {
    reflector = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: Reflector,
          useValue: reflector,
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);

    mockRequest = {
      headers: {},
      user: undefined,
    };

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
      getHandler: jest.fn().mockReturnValue({}),
    } as any;
  });

  afterEach(() => {
    mockedJwt.verify.mockClear();
    reflector.get.mockClear();
  });

  describe('canActivate', () => {
    it('should allow access with valid token and no role restrictions', async () => {
      mockRequest.headers.authorization = `Bearer ${validToken}`;
      mockedJwt.verify.mockReturnValue(mockJwtPayload as any);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockedJwt.verify).toHaveBeenCalledWith(
        validToken,
        process.env.NEXTAUTH_SECRET,
      );
    });

    it('should deny access without authorization header', () => {
      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        UnauthorizedException,
      );
    });

    it('should deny access with invalid token', () => {
      mockRequest.headers.authorization = 'Bearer invalid-token';
      mockedJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        UnauthorizedException,
      );
    });

    it('should allow access with valid token and matching role', async () => {
      mockRequest.headers.authorization = `Bearer ${validToken}`;
      mockedJwt.verify.mockReturnValue(mockJwtPayload as any);
      reflector.get.mockImplementation((key: string) => {
        if (key === 'roles') return ['client', 'lawyer'];
        return undefined;
      });

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should allow access with valid token and matching permissions', async () => {
      mockRequest.headers.authorization = `Bearer ${validToken}`;
      mockedJwt.verify.mockReturnValue(mockJwtPayload as any);
      reflector.get.mockImplementation((key: string) => {
        if (key === 'permissions') return ['read_conversations'];
        return undefined;
      });

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should deny access with insufficient role', () => {
      mockRequest.headers.authorization = `Bearer ${validToken}`;
      mockedJwt.verify.mockReturnValue(mockJwtPayload as any);
      reflector.get.mockReturnValue(['admin']);

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        ForbiddenException,
      );
    });

    it('should deny access with insufficient permissions', () => {
      mockRequest.headers.authorization = `Bearer ${validToken}`;
      mockedJwt.verify.mockReturnValue(mockJwtPayload as any);
      reflector.get.mockImplementation((key: string) => {
        if (key === 'permissions') return ['write_users'];
        return undefined;
      });

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        ForbiddenException,
      );
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from Bearer authorization header', () => {
      const request = {
        headers: {
          authorization: 'Bearer valid-token-123',
        },
      };

      const localReflector = { get: jest.fn() };
      const guard = new JwtAuthGuard(localReflector as any);
      const token = (guard as any).extractTokenFromHeader(request);

      expect(token).toBe('valid-token-123');
    });

    it('should return undefined for missing authorization header', () => {
      const request = { headers: {} };

      const localReflector = { get: jest.fn() };
      const guard = new JwtAuthGuard(localReflector as any);
      const token = (guard as any).extractTokenFromHeader(request);

      expect(token).toBeUndefined();
    });

    it('should return undefined for non-Bearer authorization header', () => {
      const request = {
        headers: {
          authorization: 'Basic dXNlcjpwYXNz',
        },
      };

      const localReflector = { get: jest.fn() };
      const guard = new JwtAuthGuard(localReflector as any);
      const token = (guard as any).extractTokenFromHeader(request);

      expect(token).toBeUndefined();
    });

    it('should return undefined for malformed authorization header', () => {
      const request = {
        headers: {
          authorization: 'Bearer',
        },
      };

      const localReflector = { get: jest.fn() };
      const guard = new JwtAuthGuard(localReflector as any);
      const token = (guard as any).extractTokenFromHeader(request);

      expect(token).toBeUndefined();
    });
  });
});

describe('Roles Decorator', () => {
  it('should be a function', () => {
    expect(typeof Roles).toBe('function');
  });

  it('should return a decorator function', () => {
    const decorator = Roles('admin', 'lawyer');
    expect(typeof decorator).toBe('function');
  });
});

describe('Permissions Decorator', () => {
  it('should be a function', () => {
    expect(typeof Permissions).toBe('function');
  });

  it('should return a decorator function', () => {
    const decorator = Permissions('read_users', 'write_users');
    expect(typeof decorator).toBe('function');
  });
});
