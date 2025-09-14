import { NextApiRequest, NextApiResponse } from 'next';
import { withBoardAccess, AuthenticatedRequest } from '../../../../utils/auth';
import { withErrorHandling, Errors } from '../../../../utils/errorHandler';
import { ListValidation } from '../../../../utils/validation';
import { PositionManager } from '../../../../utils/positioning';
import { create, find } from '../../../../utils/mockDatabase';
import { LISTS_COLLECTION } from '../../../../utils/constants';
import { CreateListRequest, ApiResponse, List } from '../../../../types/api';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { method } = req;
  const boardId = req.query.id as string;

  switch (method) {
    case 'POST':
      return await createList(req, res, boardId);
    case 'GET':
      return await getLists(req, res, boardId);
    default:
      res.setHeader('Allow', ['POST', 'GET']);
      throw Errors.notFound('Endpoint');
  }
}

async function createList(req: AuthenticatedRequest, res: NextApiResponse, boardId: string) {
  const listData: CreateListRequest = req.body;

  // Validate input
  const validationErrors = ListValidation.create(listData);
  if (validationErrors.length > 0) {
    throw Errors.validation(validationErrors);
  }

  // Get existing lists to calculate position
  const existingLists = await find(LISTS_COLLECTION, { boardId, archived: false });
  let position = listData.position;

  if (position === undefined) {
    // Add to end
    const maxPosition = Math.max(...existingLists.map(l => l.position), 0);
    position = maxPosition + PositionManager['POSITION_GAP'];
  } else {
    // Insert at specific position
    const sortedLists = existingLists.sort((a, b) => a.position - b.position);
    const insertIndex = sortedLists.findIndex(l => l.position > position);
    
    if (insertIndex > 0) {
      const prevList = sortedLists[insertIndex - 1];
      const nextList = sortedLists[insertIndex];
      position = PositionManager.calculatePosition(prevList?.position, nextList?.position);
    }
  }

  // Create list
  const listId = await create(LISTS_COLLECTION, {
    title: listData.title,
    boardId,
    position,
    archived: false,
    settings: {
      wipLimit: undefined,
      autoArchive: false,
      ...listData.settings
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const newList = await find(LISTS_COLLECTION, { id: listId });

  const response: ApiResponse<List> = {
    success: true,
    data: newList[0],
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] as string
  };

  res.status(201).json(response);
}

async function getLists(req: AuthenticatedRequest, res: NextApiResponse, boardId: string) {
  const { includeArchived = 'false' } = req.query;
  
  let filter: any = { boardId };
  if (includeArchived !== 'true') {
    filter.archived = false;
  }

  const lists = await find(LISTS_COLLECTION, filter);
  
  // Sort by position
  const sortedLists = lists.sort((a, b) => a.position - b.position);

  const response: ApiResponse<List[]> = {
    success: true,
    data: sortedLists,
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] as string
  };

  res.status(200).json(response);
}

export default withErrorHandling(withBoardAccess(handler));
