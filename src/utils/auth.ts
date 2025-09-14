import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextApiRequest, NextApiResponse } from 'next';
import { JWTPayload, ErrorCode, ApiResponse } from '../types/api';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret-key';
const JWT_EXPIRES_IN = '7d';
const REFRESH_TOKEN_EXPIRES_IN = '30d';

export class AuthUtils {
  static async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 12);
  }

  static async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  static generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  static generateRefreshToken(userId: string): string {
    return jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
  }

  static verifyToken(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch (error) {
      return null;
    }
  }

  static extractTokenFromRequest(req: NextApiRequest): string | null {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    // Also check cookies for web clients
    const tokenCookie = req.cookies.accessToken;
    if (tokenCookie) {
      return tokenCookie;
    }
    
    return null;
  }

  static setAuthCookies(res: NextApiResponse, accessToken: string, refreshToken: string): void {
    const isProduction = process.env.NODE_ENV === 'production';
    
    res.setHeader('Set-Cookie', [
      `accessToken=${accessToken}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; ${isProduction ? 'Secure; ' : ''}SameSite=Strict`,
      `refreshToken=${refreshToken}; HttpOnly; Path=/; Max-Age=${30 * 24 * 60 * 60}; ${isProduction ? 'Secure; ' : ''}SameSite=Strict`
    ]);
  }

  static clearAuthCookies(res: NextApiResponse): void {
    res.setHeader('Set-Cookie', [
      'accessToken=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict',
      'refreshToken=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict'
    ]);
  }
}

// Authentication middleware
export interface AuthenticatedRequest extends NextApiRequest {
  user: JWTPayload;
}

export function withAuth(handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const token = AuthUtils.extractTokenFromRequest(req);
      
      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: ErrorCode.UNAUTHORIZED,
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown'
        } as ApiResponse);
      }

      const payload = AuthUtils.verifyToken(token);
      
      if (!payload) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired token',
          code: ErrorCode.TOKEN_EXPIRED,
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown'
        } as ApiResponse);
      }

      // Add user to request
      (req as AuthenticatedRequest).user = payload;
      
      return await handler(req as AuthenticatedRequest, res);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      } as ApiResponse);
    }
  };
}

// Role-based authorization
export enum BoardRole {
  OWNER = 'owner',
  MEMBER = 'member'
}

export enum WorkspaceRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member'
}

export class AuthorizationUtils {
  static canManageBoard(userRole: BoardRole): boolean {
    return userRole === BoardRole.OWNER;
  }

  static canAccessBoard(userRole: BoardRole | null): boolean {
    return userRole !== null;
  }

  static canManageWorkspace(userRole: WorkspaceRole): boolean {
    return userRole === WorkspaceRole.OWNER || userRole === WorkspaceRole.ADMIN;
  }

  static canAccessWorkspace(userRole: WorkspaceRole | null): boolean {
    return userRole !== null;
  }

  static canInviteToBoard(userRole: BoardRole): boolean {
    return userRole === BoardRole.OWNER;
  }

  static canInviteToWorkspace(userRole: WorkspaceRole): boolean {
    return userRole === WorkspaceRole.OWNER || userRole === WorkspaceRole.ADMIN;
  }
}

// Permission checking middleware
export function withBoardAccess(
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>,
  requiredRole: BoardRole = BoardRole.MEMBER
) {
  return withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    try {
      const boardId = req.query.boardId as string || req.query.id as string;
      
      if (!boardId) {
        return res.status(400).json({
          success: false,
          error: 'Board ID is required',
          code: ErrorCode.MISSING_REQUIRED_FIELD,
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown'
        } as ApiResponse);
      }

      // Get board and check user access
      const { findById } = await import('./mockDatabase');
      const { BOARDS_COLLECTION } = await import('./constants');
      
      const board = await findById(BOARDS_COLLECTION, boardId);
      
      if (!board) {
        return res.status(404).json({
          success: false,
          error: 'Board not found',
          code: ErrorCode.NOT_FOUND,
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown'
        } as ApiResponse);
      }

      // Check user role in board
      const userRole = board.author === req.user.userId 
        ? BoardRole.OWNER 
        : board.members?.includes(req.user.userId) 
          ? BoardRole.MEMBER 
          : null;

      if (!userRole) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this board',
          code: ErrorCode.BOARD_ACCESS_DENIED,
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown'
        } as ApiResponse);
      }

      // Check if user has required role
      if (requiredRole === BoardRole.OWNER && userRole !== BoardRole.OWNER) {
        return res.status(403).json({
          success: false,
          error: 'Owner access required',
          code: ErrorCode.INSUFFICIENT_PERMISSIONS,
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown'
        } as ApiResponse);
      }

      // Add board and user role to request
      (req as any).board = board;
      (req as any).userRole = userRole;
      
      return await handler(req, res);
    } catch (error) {
      console.error('Board access middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      } as ApiResponse);
    }
  });
}
