import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '../../../../utils/auth';
import { withErrorHandling, Errors } from '../../../../utils/errorHandler';
import { CommentValidation } from '../../../../utils/validation';
import { create, find, findById } from '../../../../utils/mockDatabase';
import { COMMENTS_COLLECTION, CARDS_COLLECTION, LISTS_COLLECTION, BOARDS_COLLECTION } from '../../../../utils/constants';
import { CreateCommentRequest, ApiResponse, Comment } from '../../../../types/api';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { method } = req;
  const cardId = req.query.id as string;

  // Verify card exists and user has board access
  const card = await findById(CARDS_COLLECTION, cardId);
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

  switch (method) {
    case 'POST':
      return await createComment(req, res, cardId);
    case 'GET':
      return await getComments(req, res, cardId);
    default:
      res.setHeader('Allow', ['POST', 'GET']);
      throw Errors.notFound('Endpoint');
  }
}

async function createComment(req: AuthenticatedRequest, res: NextApiResponse, cardId: string) {
  const commentData: CreateCommentRequest = req.body;

  // Validate input
  const validationErrors = CommentValidation.create(commentData);
  if (validationErrors.length > 0) {
    throw Errors.validation(validationErrors);
  }

  // Create comment
  const commentId = await create(COMMENTS_COLLECTION, {
    content: commentData.content,
    cardId,
    authorId: req.user.userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const newComment = await find(COMMENTS_COLLECTION, { id: commentId });

  const response: ApiResponse<Comment> = {
    success: true,
    data: newComment[0],
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] as string
  };

  res.status(201).json(response);
}

async function getComments(req: AuthenticatedRequest, res: NextApiResponse, cardId: string) {
  const { limit = '50', offset = '0' } = req.query;
  
  const comments = await find(COMMENTS_COLLECTION, { cardId });
  
  // Sort by creation date (newest first)
  const sortedComments = comments.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Apply pagination
  const limitNum = parseInt(limit as string, 10);
  const offsetNum = parseInt(offset as string, 10);
  const paginatedComments = sortedComments.slice(offsetNum, offsetNum + limitNum);

  const response: ApiResponse<Comment[]> = {
    success: true,
    data: paginatedComments,
    meta: {
      total: sortedComments.length,
      limit: limitNum,
      offset: offsetNum,
      hasMore: offsetNum + limitNum < sortedComments.length
    },
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] as string
  };

  res.status(200).json(response);
}

export default withErrorHandling(withAuth(handler));
