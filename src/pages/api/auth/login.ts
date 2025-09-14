import { NextApiRequest, NextApiResponse } from 'next';
import { withErrorHandling, Errors } from '../../../utils/errorHandler';
import { ValidationUtils } from '../../../utils/validation';
import { AuthUtils } from '../../../utils/auth';
import { find } from '../../../utils/mockDatabase';
import { USERS_COLLECTION } from '../../../utils/constants';
import { LoginRequest, ApiResponse, User, AuthTokens } from '../../../types/api';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    throw Errors.notFound('Endpoint');
  }

  const { email, password }: LoginRequest = req.body;

  // Validate input
  const emailError = ValidationUtils.validateEmail(email);
  if (emailError) {
    throw Errors.validation([emailError]);
  }

  const passwordError = ValidationUtils.validateRequired(password, 'password');
  if (passwordError) {
    throw Errors.validation([passwordError]);
  }

  // Find user by email
  const users = await find(USERS_COLLECTION, { email });
  if (users.length === 0) {
    throw Errors.invalidCredentials();
  }

  const user = users[0];

  // Verify password
  const isValidPassword = await AuthUtils.comparePassword(password, user.password);
  if (!isValidPassword) {
    throw Errors.invalidCredentials();
  }

  // Generate tokens
  const accessToken = AuthUtils.generateAccessToken({
    userId: user.id,
    email: user.email,
    name: user.name
  });
  const refreshToken = AuthUtils.generateRefreshToken(user.id);

  // Set auth cookies
  AuthUtils.setAuthCookies(res, accessToken, refreshToken);

  // Remove sensitive data
  const { password: _, ...safeUser } = user;

  const response: ApiResponse<{ user: User; tokens: AuthTokens }> = {
    success: true,
    data: {
      user: safeUser,
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 7 * 24 * 60 * 60 // 7 days in seconds
      }
    },
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] as string
  };

  res.status(200).json(response);
}

export default withErrorHandling(handler);
