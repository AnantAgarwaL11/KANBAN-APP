import { NextApiRequest, NextApiResponse } from 'next';
import { withErrorHandling, Errors } from '../../../utils/errorHandler';
import { UserValidation } from '../../../utils/validation';
import { AuthUtils } from '../../../utils/auth';
import { create, find } from '../../../utils/mockDatabase';
import { USERS_COLLECTION } from '../../../utils/constants';
import { CreateUserRequest, ApiResponse, User } from '../../../types/api';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  switch (method) {
    case 'POST':
      return await createUser(req, res);
    case 'GET':
      return await getUsers(req, res);
    default:
      res.setHeader('Allow', ['POST', 'GET']);
      throw Errors.notFound('Endpoint');
  }
}

async function createUser(req: NextApiRequest, res: NextApiResponse) {
  const userData: CreateUserRequest = req.body;

  // Validate input
  const validationErrors = UserValidation.create(userData);
  if (validationErrors.length > 0) {
    throw Errors.validation(validationErrors);
  }

  // Check if user already exists
  const existingUsers = await find(USERS_COLLECTION, { email: userData.email });
  if (existingUsers.length > 0) {
    throw Errors.duplicateEmail();
  }

  // Hash password
  const hashedPassword = await AuthUtils.hashPassword(userData.password);

  // Create user
  const userId = await create(USERS_COLLECTION, {
    email: userData.email,
    password: hashedPassword,
    name: userData.name,
    avatar: userData.avatar,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    preferences: {
      theme: 'light',
      notifications: true,
      defaultBoardColor: '#0079bf'
    }
  });

  // Generate tokens
  const accessToken = AuthUtils.generateAccessToken({
    userId,
    email: userData.email,
    name: userData.name
  });
  const refreshToken = AuthUtils.generateRefreshToken(userId);

  // Set auth cookies
  AuthUtils.setAuthCookies(res, accessToken, refreshToken);

  const response: ApiResponse<{ user: Omit<User, 'password'>; tokens: { accessToken: string; refreshToken: string } }> = {
    success: true,
    data: {
      user: {
        id: userId,
        email: userData.email,
        name: userData.name,
        avatar: userData.avatar,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        preferences: {
          theme: 'light',
          notifications: true,
          defaultBoardColor: '#0079bf'
        }
      },
      tokens: {
        accessToken,
        refreshToken
      }
    },
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] as string
  };

  res.status(201).json(response);
}

async function getUsers(req: NextApiRequest, res: NextApiResponse) {
  const { search, limit = '20', page = '1' } = req.query;
  
  let filter = {};
  if (search) {
    // Simple search by name or email
    const searchTerm = search as string;
    const users = await find(USERS_COLLECTION, {});
    const filteredUsers = users.filter(user => 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedUsers = filteredUsers.slice(startIndex, startIndex + limitNum);
    
    // Remove sensitive data
    const safeUsers = paginatedUsers.map(({ password, ...user }) => user);
    
    const response: ApiResponse<User[]> = {
      success: true,
      data: safeUsers,
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] as string
    };
    
    return res.status(200).json(response);
  }

  // Get all users (for admin purposes, should be protected in real app)
  const users = await find(USERS_COLLECTION, filter);
  const safeUsers = users.map(({ password, ...user }) => user);

  const response: ApiResponse<User[]> = {
    success: true,
    data: safeUsers,
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] as string
  };

  res.status(200).json(response);
}

export default withErrorHandling(handler);
