import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '../../../utils/auth';
import { withErrorHandling, Errors } from '../../../utils/errorHandler';
import { CommentValidation } from '../../../utils/validation';
import { findById, update, deleteById } from '../../../utils/mockDatabase';
import { COMMENTS_COLLECTION, CARDS_COLLECTION, LISTS_COLLECTION, BOARDS_COLLECTION } from '../../../utils/constants';
import { UpdateCommentRequest, ApiResponse, Comment } from '../../../types/api';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { method } = req;
  const commentId = req.query.id as string;

  // Get comment and verify board access
  const comment = await findById(COMMENTS_COLLECTION, commentId);
  if (!comment) {
    throw Errors.notFound('Comment');
  }

  const card = await findById(CARDS_COLLECTION, comment.cardId);
  if (!card) {
    throw Errors.notFound('Card');
  }

  const list = await findById(LISTS_COLLECTION, card.listId);
  if (!list) {
    throw Errors.notFound('List');
  }

  const board = await findById(BOARDS_COLLECTION, list.boardId);
  if (!board) {
    throw Errors.notFound('Board');
  }

  const userRole = board.author === req.user.userId 
    ? 'owner' 
    : board.members?.includes(req.user.userId) 
      ? 'member' 
      : null;

  if (!userRole) {
    throw Errors.boardAccess();
  }

  // Check if user can modify this comment (author or board owner)
  const canModify = comment.authorId === req.user.userId || userRole === 'owner';

  switch (method) {
    case 'GET':
      return await getComment(req, res, comment);
    case 'PUT':
      if (!canModify) {
        throw Errors.insufficientPermissions();
      }
      return await updateComment(req, res, comment);
    case 'DELETE':
      if (!canModify) {
        throw Errors.insufficientPermissions();
      }
      return await deleteComment(req, res, comment);
    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      throw Errors.notFound('Endpoint');
  }
}

async function getComment(req: AuthenticatedRequest, res: NextApiResponse, comment: Comment) {
  const response: ApiResponse<Comment> = {
    success: true,
    data: comment,
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] as string
  };

  res.status(200).json(response);
}

async function updateComment(req: AuthenticatedRequest, res: NextApiResponse, comment: Comment) {
  const updateData: UpdateCommentRequest = req.body;

  // Validate input
  const validationErrors = CommentValidation.update(updateData);
  if (validationErrors.length > 0) {
    throw Errors.validation(validationErrors);
  }

  // Update comment
  const success = await update(COMMENTS_COLLECTION, comment.id, {
    ...updateData,
    updatedAt: new Date().toISOString()
  });

  if (!success) {
    throw new Error('Failed to update comment');
  }

  // Get updated comment
  const updatedComment = await findById(COMMENTS_COLLECTION, comment.id);

  const response: ApiResponse<Comment> = {
    success: true,
    data: updatedComment,
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] as string
  };

  res.status(200).json(response);
}

async function deleteComment(req: AuthenticatedRequest, res: NextApiResponse, comment: Comment) {
  // Hard delete comment
  const success = await deleteById(COMMENTS_COLLECTION, comment.id);

  if (!success) {
    throw new Error('Failed to delete comment');
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
