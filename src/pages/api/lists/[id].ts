import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '../../../utils/auth';
import { withErrorHandling, Errors } from '../../../utils/errorHandler';
import { ListValidation } from '../../../utils/validation';
import { PositionManager } from '../../../utils/positioning';
import { findById, update, deleteById, find } from '../../../utils/mockDatabase';
import { LISTS_COLLECTION, BOARDS_COLLECTION, CARDS_COLLECTION } from '../../../utils/constants';
import { UpdateListRequest, ApiResponse, List } from '../../../types/api';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { method } = req;
  const listId = req.query.id as string;

  // Get list and verify board access
  const list = await findById(LISTS_COLLECTION, listId);
  if (!list) {
    throw Errors.notFound('List');
  }

  // Check board access
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
    case 'GET':
      return await getList(req, res, list);
    case 'PUT':
      return await updateList(req, res, list);
    case 'DELETE':
      return await deleteList(req, res, list, userRole);
    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      throw Errors.notFound('Endpoint');
  }
}

async function getList(req: AuthenticatedRequest, res: NextApiResponse, list: List) {
  const response: ApiResponse<List> = {
    success: true,
    data: list,
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] as string
  };

  res.status(200).json(response);
}

async function updateList(req: AuthenticatedRequest, res: NextApiResponse, list: List) {
  const updateData: UpdateListRequest = req.body;

  // Validate input
  const validationErrors = ListValidation.update(updateData);
  if (validationErrors.length > 0) {
    throw Errors.validation(validationErrors);
  }

  let finalUpdateData = { ...updateData };

  // Handle position update
  if (updateData.position !== undefined && updateData.position !== list.position) {
    const otherLists = await find(LISTS_COLLECTION, { 
      boardId: list.boardId, 
      archived: false,
      id: { $ne: list.id }
    });

    try {
      const updates = PositionManager.updatePositionsForMove(
        [...otherLists, list],
        list.id,
        updateData.position
      );

      // Update other lists' positions if needed
      for (const posUpdate of updates) {
        if (posUpdate.id !== list.id) {
          await update(LISTS_COLLECTION, posUpdate.id, { position: posUpdate.position });
        } else {
          finalUpdateData.position = posUpdate.position;
        }
      }
    } catch (error) {
      if (error.message === 'REBALANCE_REQUIRED') {
        // Rebalance all lists
        const allLists = [...otherLists, list];
        const rebalanced = PositionManager.rebalancePositions(allLists);
        
        for (const posUpdate of rebalanced) {
          if (posUpdate.id !== list.id) {
            await update(LISTS_COLLECTION, posUpdate.id, { position: posUpdate.position });
          } else {
            finalUpdateData.position = posUpdate.position;
          }
        }
      } else {
        throw error;
      }
    }
  }

  // Update list
  const success = await update(LISTS_COLLECTION, list.id, {
    ...finalUpdateData,
    updatedAt: new Date().toISOString()
  });

  if (!success) {
    throw new Error('Failed to update list');
  }

  // Get updated list
  const updatedList = await findById(LISTS_COLLECTION, list.id);

  const response: ApiResponse<List> = {
    success: true,
    data: updatedList,
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] as string
  };

  res.status(200).json(response);
}

async function deleteList(req: AuthenticatedRequest, res: NextApiResponse, list: List, userRole: string) {
  // Only board owners can delete lists (or you could allow members too)
  if (userRole !== 'owner') {
    throw Errors.insufficientPermissions();
  }

  // Archive or delete associated cards
  const cards = await find(CARDS_COLLECTION, { listId: list.id });
  for (const card of cards) {
    await update(CARDS_COLLECTION, card.id, { archived: true });
  }

  // Delete list
  const success = await deleteById(LISTS_COLLECTION, list.id);

  if (!success) {
    throw new Error('Failed to delete list');
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
