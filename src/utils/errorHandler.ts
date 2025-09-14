import { NextApiRequest, NextApiResponse } from 'next';
import { ApiResponse, ErrorCode, ValidationError } from '../types/api';

export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationApiError extends ApiError {
  constructor(public validationErrors: ValidationError[]) {
    super(
      ErrorCode.VALIDATION_ERROR,
      'Validation failed',
      400,
      { validationErrors }
    );
  }
}

export function createErrorResponse(
  error: Error | ApiError,
  req: NextApiRequest
): ApiResponse {
  const requestId = req.headers['x-request-id'] as string || generateRequestId();
  const timestamp = new Date().toISOString();

  if (error instanceof ValidationApiError) {
    return {
      success: false,
      error: error.message,
      code: error.code,
      timestamp,
      requestId,
      data: error.details
    };
  }

  if (error instanceof ApiError) {
    return {
      success: false,
      error: error.message,
      code: error.code,
      timestamp,
      requestId,
      data: error.details
    };
  }

  // Log unexpected errors
  console.error('Unexpected error:', {
    message: error.message,
    stack: error.stack,
    requestId,
    url: req.url,
    method: req.method,
    timestamp
  });

  return {
    success: false,
    error: 'Internal server error',
    code: ErrorCode.INTERNAL_SERVER_ERROR,
    timestamp,
    requestId
  };
}

export function handleApiError(
  error: Error,
  req: NextApiRequest,
  res: NextApiResponse
): void {
  const errorResponse = createErrorResponse(error, req);
  
  let statusCode = 500;
  if (error instanceof ApiError) {
    statusCode = error.statusCode;
  }

  res.status(statusCode).json(errorResponse);
}

export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Middleware to add request ID and error handling
export function withErrorHandling(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Add request ID if not present
    if (!req.headers['x-request-id']) {
      req.headers['x-request-id'] = generateRequestId();
    }

    try {
      await handler(req, res);
    } catch (error) {
      handleApiError(error as Error, req, res);
    }
  };
}

// Common error factories
export const Errors = {
  unauthorized: () => new ApiError(ErrorCode.UNAUTHORIZED, 'Authentication required', 401),
  forbidden: () => new ApiError(ErrorCode.FORBIDDEN, 'Access denied', 403),
  notFound: (resource = 'Resource') => new ApiError(ErrorCode.NOT_FOUND, `${resource} not found`, 404),
  conflict: (message: string) => new ApiError(ErrorCode.ALREADY_EXISTS, message, 409),
  validation: (errors: ValidationError[]) => new ValidationApiError(errors),
  invalidCredentials: () => new ApiError(ErrorCode.INVALID_CREDENTIALS, 'Invalid email or password', 401),
  tokenExpired: () => new ApiError(ErrorCode.TOKEN_EXPIRED, 'Token has expired', 401),
  duplicateEmail: () => new ApiError(ErrorCode.DUPLICATE_EMAIL, 'Email already exists', 409),
  boardAccess: () => new ApiError(ErrorCode.BOARD_ACCESS_DENIED, 'Access denied to this board', 403),
  workspaceAccess: () => new ApiError(ErrorCode.WORKSPACE_ACCESS_DENIED, 'Access denied to this workspace', 403),
  insufficientPermissions: () => new ApiError(ErrorCode.INSUFFICIENT_PERMISSIONS, 'Insufficient permissions', 403),
};
