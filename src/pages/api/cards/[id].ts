import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '../../../utils/auth';
import { withErrorHandling, Errors } from '../../../utils/errorHandler';
import { CardValidation } from '../../../utils/validation';
import { PositionManager } from '../../../utils/positioning';
import { findById, update, deleteById, find } from '../../../utils/mockDatabase';
import { CARDS_COLLECTION, LISTS_COLLECTION, BOARDS_COLLECTION } from '../../../utils/constants';
import { UpdateCardRequest, MoveCardRequest, ApiResponse, Card } from '../../../types/api';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { method } = req;
  const cardId = req.query.id as string;

  // Get card and verify board access
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
    case 'GET':
      return await getCard(req, res, card);
    case 'PUT':
      return await updateCard(req, res, card);
    case 'DELETE':
      return await deleteCard(req, res, card);
    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      throw Errors.notFound('Endpoint');
  }
}

async function getCard(req: AuthenticatedRequest, res: NextApiResponse, card: Card) {
  const response: ApiResponse<Card> = {
    success: true,
    data: card,
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] as string
  };

  res.status(200).json(response);
}

async function updateCard(req: AuthenticatedRequest, res: NextApiResponse, card: Card) {
  const updateData: UpdateCardRequest = req.body;

  // Validate input
  const validationErrors = CardValidation.update(updateData);
  if (validationErrors.length > 0) {
    throw Errors.validation(validationErrors);
  }

  let finalUpdateData = { ...updateData };

  // Handle position update within same list
  if (updateData.position !== undefined && updateData.position !== card.position) {
    const otherCards = await find(CARDS_COLLECTION, { 
      listId: card.listId, 
      archived: false,
      id: { $ne: card.id }
    });

    try {
      const updates = PositionManager.updatePositionsForMove(
        [...otherCards, card],
        card.id,
        updateData.position
      );

      // Update other cards' positions if needed
      for (const posUpdate of updates) {
        if (posUpdate.id !== card.id) {
          await update(CARDS_COLLECTION, posUpdate.id, { position: posUpdate.position });
        } else {
          finalUpdateData.position = posUpdate.position;
        }
      }
    } catch (error) {
      if (error.message === 'REBALANCE_REQUIRED') {
        // Rebalance all cards
        const allCards = [...otherCards, card];
        const rebalanced = PositionManager.rebalancePositions(allCards);
        
        for (const posUpdate of rebalanced) {
          if (posUpdate.id !== card.id) {
            await update(CARDS_COLLECTION, posUpdate.id, { position: posUpdate.position });
          } else {
            finalUpdateData.position = posUpdate.position;
          }
        }
      } else {
        throw error;
      }
    }
  }

  // Handle labels update
  if (updateData.labels) {
    const labels = updateData.labels.map(labelName => ({
      id: `label_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: labelName,
      color: getRandomLabelColor()
    }));
    finalUpdateData.labels = labels;
  }

  // Update card
  const success = await update(CARDS_COLLECTION, card.id, {
    ...finalUpdateData,
    updatedAt: new Date().toISOString()
  });

  if (!success) {
    throw new Error('Failed to update card');
  }

  // Get updated card
  const updatedCard = await findById(CARDS_COLLECTION, card.id);

  const response: ApiResponse<Card> = {
    success: true,
    data: updatedCard,
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] as string
  };

  res.status(200).json(response);
}

async function deleteCard(req: AuthenticatedRequest, res: NextApiResponse, card: Card) {
  // Archive card instead of hard delete
  const success = await update(CARDS_COLLECTION, card.id, { 
    archived: true,
    updatedAt: new Date().toISOString()
  });

  if (!success) {
    throw new Error('Failed to delete card');
  }

  const response: ApiResponse<{ deleted: boolean }> = {
    success: true,
    data: { deleted: true },
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] as string
  };

  res.status(200).json(response);
}

function getRandomLabelColor(): string {
  const colors = [
    '#61bd4f', '#f2d600', '#ff9f1a', '#eb5a46', '#c377e0',
    '#0079bf', '#00c2e0', '#51e898', '#ff78cb', '#344563'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

export default withErrorHandling(withAuth(handler));
