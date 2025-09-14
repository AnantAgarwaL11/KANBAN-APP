import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '../../../utils/auth';
import { withErrorHandling, Errors } from '../../../utils/errorHandler';
import { UserValidation } from '../../../utils/validation';
import { findById, update, deleteById } from '../../../utils/mockDatabase';
import { USERS_COLLECTION } from '../../../utils/constants';
import { UpdateUserRequest, ApiResponse, User } from '../../../types/api';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { method } = req;
  const userId = req.query.id as string;

  // Users can only access their own profile (or admin access could be added)
  if (userId !== req.user.userId) {
    throw Errors.forbidden();
  }

  switch (method) {
    case 'GET':
      return await getUser(req, res, userId);
    case 'PUT':
      return await updateUser(req, res, userId);
    case 'DELETE':
      return await deleteUser(req, res, userId);
    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      throw Errors.notFound('Endpoint');
  }
}

async function getUser(req: AuthenticatedRequest, res: NextApiResponse, userId: string) {
  const user = await findById(USERS_COLLECTION, userId);
  
  if (!user) {
    throw Errors.notFound('User');
  }

  // Remove sensitive data
  const { password, ...safeUser } = user;

  const response: ApiResponse<User> = {
    success: true,
    data: safeUser,
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] as string
  };

  res.status(200).json(response);
}

async function updateUser(req: AuthenticatedRequest, res: NextApiResponse, userId: string) {
  const updateData: UpdateUserRequest = req.body;

  // Validate input
  const validationErrors = UserValidation.update(updateData);
  if (validationErrors.length > 0) {
    throw Errors.validation(validationErrors);
  }

  const user = await findById(USERS_COLLECTION, userId);
  if (!user) {
    throw Errors.notFound('User');
  }

  // Update user
  const success = await update(USERS_COLLECTION, userId, {
    ...updateData,
    updatedAt: new Date().toISOString()
  });

  if (!success) {
    throw new Error('Failed to update user');
  }

  // Get updated user
  const updatedUser = await findById(USERS_COLLECTION, userId);
  const { password, ...safeUser } = updatedUser;

  const response: ApiResponse<User> = {
    success: true,
    data: safeUser,
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] as string
  };

  res.status(200).json(response);
}

async function deleteUser(req: AuthenticatedRequest, res: NextApiResponse, userId: string) {
  const user = await findById(USERS_COLLECTION, userId);
  if (!user) {
    throw Errors.notFound('User');
  }

  // In a real app, you'd want to handle cascading deletes or data anonymization
  const success = await deleteById(USERS_COLLECTION, userId);

  if (!success) {
    throw new Error('Failed to delete user');
  }

  const response: ApiResponse<{ deleted: boolean }> = {
    success: true,
    data: { deleted: true },
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] as string
  };

  res.status(200).json(response);
}

export default withErrorHandling(withAuth(handler));
