import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '../../../utils/auth';
import { withErrorHandling, Errors } from '../../../utils/errorHandler';
import { ActivityValidation } from '../../../utils/validation';
import { create, find, findById } from '../../../utils/mockDatabase';
import { ACTIVITY_COLLECTION, BOARDS_COLLECTION } from '../../../utils/constants';
import { CreateActivityRequest, ApiResponse, Activity } from '../../../types/api';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { method } = req;

  switch (method) {
    case 'POST':
      return await createActivity(req, res);
    case 'GET':
      return await getActivities(req, res);
    default:
      res.setHeader('Allow', ['POST', 'GET']);
      throw Errors.notFound('Endpoint');
  }
}

async function createActivity(req: AuthenticatedRequest, res: NextApiResponse) {
  const activityData: CreateActivityRequest = req.body;

  // Validate input
  const validationErrors = ActivityValidation.create(activityData);
  if (validationErrors.length > 0) {
    throw Errors.validation(validationErrors);
  }

  // Verify board access if boardId is provided
  if (activityData.boardId) {
    const board = await findById(BOARDS_COLLECTION, activityData.boardId);
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
  }

  // Create activity log entry
  const activityId = await create(ACTIVITY_COLLECTION, {
    type: activityData.type,
    description: activityData.description,
    userId: req.user.userId,
    boardId: activityData.boardId,
    entityId: activityData.entityId,
    entityType: activityData.entityType,
    metadata: activityData.metadata || {},
    createdAt: new Date().toISOString()
  });

  const newActivity = await find(ACTIVITY_COLLECTION, { id: activityId });

  const response: ApiResponse<Activity> = {
    success: true,
    data: newActivity[0],
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] as string
  };

  res.status(201).json(response);
}

async function getActivities(req: AuthenticatedRequest, res: NextApiResponse) {
  const { 
    boardId, 
    userId, 
    type, 
    entityType,
    limit = '50', 
    offset = '0',
    startDate,
    endDate
  } = req.query;

  // Build filter
  let filter: any = {};

  if (boardId) {
    // Verify board access
    const board = await findById(BOARDS_COLLECTION, boardId as string);
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

    filter.boardId = boardId;
  } else {
    // If no boardId specified, only show activities for boards user has access to
    const userBoards = await find(BOARDS_COLLECTION, {
      $or: [
        { author: req.user.userId },
        { members: { $in: [req.user.userId] } }
      ]
    });
    
    const boardIds = userBoards.map(b => b.id);
    if (boardIds.length > 0) {
      filter.boardId = { $in: boardIds };
    } else {
      // User has no boards, return empty result
      const response: ApiResponse<Activity[]> = {
        success: true,
        data: [],
        meta: {
          total: 0,
          limit: parseInt(limit as string, 10),
          offset: parseInt(offset as string, 10),
          hasMore: false
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string
      };
      return res.status(200).json(response);
    }
  }

  if (userId) filter.userId = userId;
  if (type) filter.type = type;
  if (entityType) filter.entityType = entityType;

  // Date range filter
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = startDate;
    if (endDate) filter.createdAt.$lte = endDate;
  }

  const activities = await find(ACTIVITY_COLLECTION, filter);
  
  // Sort by creation date (newest first)
  const sortedActivities = activities.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Apply pagination
  const limitNum = parseInt(limit as string, 10);
  const offsetNum = parseInt(offset as string, 10);
  const paginatedActivities = sortedActivities.slice(offsetNum, offsetNum + limitNum);

  const response: ApiResponse<Activity[]> = {
    success: true,
    data: paginatedActivities,
    meta: {
      total: sortedActivities.length,
      limit: limitNum,
      offset: offsetNum,
      hasMore: offsetNum + limitNum < sortedActivities.length
    },
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] as string
  };

  res.status(200).json(response);
}

export default withErrorHandling(withAuth(handler));
