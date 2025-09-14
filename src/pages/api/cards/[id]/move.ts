import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '../../../../utils/auth';
import { withErrorHandling, Errors } from '../../../../utils/errorHandler';
import { CardValidation } from '../../../../utils/validation';
import { PositionManager } from '../../../../utils/positioning';
import { findById, update, find } from '../../../../utils/mockDatabase';
import { CARDS_COLLECTION, LISTS_COLLECTION, BOARDS_COLLECTION } from '../../../../utils/constants';
import { MoveCardRequest, ApiResponse, Card } from '../../../../types/api';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    throw Errors.notFound('Endpoint');
  }

  const cardId = req.query.id as string;
  const moveData: MoveCardRequest = req.body;

  // Validate input
  const validationErrors = CardValidation.move(moveData);
  if (validationErrors.length > 0) {
    throw Errors.validation(validationErrors);
  }

  // Get card and verify access
  const card = await findById(CARDS_COLLECTION, cardId);
  if (!card) {
    throw Errors.notFound('Card');
  }

  const sourceList = await findById(LISTS_COLLECTION, card.listId);
  const targetList = await findById(LISTS_COLLECTION, moveData.targetListId);
  
  if (!sourceList || !targetList) {
    throw Errors.notFound('List');
  }

  // Verify both lists belong to the same board
  if (sourceList.boardId !== targetList.boardId) {
    throw Errors.validation([{
      field: 'targetListId',
      message: 'Cannot move card between different boards',
      code: 'INVALID_OPERATION'
    }]);
  }

  const board = await findById(BOARDS_COLLECTION, sourceList.boardId);
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

  // Handle the move
  if (card.listId === moveData.targetListId) {
    // Moving within same list - just update position
    await updatePositionInSameList(card, moveData.position);
  } else {
    // Moving to different list
    await moveCardBetweenLists(card, moveData.targetListId, moveData.position);
  }

  // Get updated card
  const updatedCard = await findById(CARDS_COLLECTION, cardId);

  const response: ApiResponse<Card> = {
    success: true,
    data: updatedCard,
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] as string
  };

  res.status(200).json(response);
}

async function updatePositionInSameList(card: Card, targetPosition: number) {
  const otherCards = await find(CARDS_COLLECTION, { 
    listId: card.listId, 
    archived: false,
    id: { $ne: card.id }
  });

  try {
    const updates = PositionManager.updatePositionsForMove(
      [...otherCards, card],
      card.id,
      targetPosition
    );

    // Apply position updates
    for (const posUpdate of updates) {
      await update(CARDS_COLLECTION, posUpdate.id, { 
        position: posUpdate.position,
        updatedAt: new Date().toISOString()
      });
    }
  } catch (error) {
    if (error.message === 'REBALANCE_REQUIRED') {
      // Rebalance all cards in the list
      const allCards = [...otherCards, card];
      const rebalanced = PositionManager.rebalancePositions(allCards);
      
      for (const posUpdate of rebalanced) {
        await update(CARDS_COLLECTION, posUpdate.id, { 
          position: posUpdate.position,
          updatedAt: new Date().toISOString()
        });
      }
    } else {
      throw error;
    }
  }
}

async function moveCardBetweenLists(card: Card, targetListId: string, targetPosition: number) {
  // Get cards in target list
  const targetListCards = await find(CARDS_COLLECTION, { 
    listId: targetListId, 
    archived: false 
  });

  // Calculate position in target list
  let newPosition = targetPosition;
  
  if (targetListCards.length === 0) {
    // First card in empty list
    newPosition = PositionManager['POSITION_GAP'];
  } else {
    const sortedCards = targetListCards.sort((a, b) => a.position - b.position);
    
    if (targetPosition <= 0) {
      // Insert at beginning
      newPosition = Math.max(sortedCards[0].position / 2, PositionManager['MIN_POSITION']);
    } else if (targetPosition >= sortedCards.length) {
      // Insert at end
      newPosition = sortedCards[sortedCards.length - 1].position + PositionManager['POSITION_GAP'];
    } else {
      // Insert between cards
      const prevCard = sortedCards[targetPosition - 1];
      const nextCard = sortedCards[targetPosition];
      newPosition = PositionManager.calculatePosition(prevCard?.position, nextCard?.position);
    }
  }

  // Update card with new list and position
  await update(CARDS_COLLECTION, card.id, {
    listId: targetListId,
    position: newPosition,
    updatedAt: new Date().toISOString()
  });
}

export default withErrorHandling(withAuth(handler));
