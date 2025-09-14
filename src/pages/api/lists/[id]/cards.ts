import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '../../../../utils/auth';
import { withErrorHandling, Errors } from '../../../../utils/errorHandler';
import { CardValidation } from '../../../../utils/validation';
import { PositionManager } from '../../../../utils/positioning';
import { create, find, findById } from '../../../../utils/mockDatabase';
import { CARDS_COLLECTION, LISTS_COLLECTION, BOARDS_COLLECTION } from '../../../../utils/constants';
import { CreateCardRequest, ApiResponse, Card } from '../../../../types/api';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { method } = req;
  const listId = req.query.id as string;

  // Verify list exists and user has board access
  const list = await findById(LISTS_COLLECTION, listId);
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
      return await createCard(req, res, listId);
    case 'GET':
      return await getCards(req, res, listId);
    default:
      res.setHeader('Allow', ['POST', 'GET']);
      throw Errors.notFound('Endpoint');
  }
}

async function createCard(req: AuthenticatedRequest, res: NextApiResponse, listId: string) {
  const cardData: CreateCardRequest = req.body;

  // Validate input
  const validationErrors = CardValidation.create(cardData);
  if (validationErrors.length > 0) {
    throw Errors.validation(validationErrors);
  }

  // Get existing cards to calculate position
  const existingCards = await find(CARDS_COLLECTION, { listId, archived: false });
  let position = cardData.position;

  if (position === undefined) {
    // Add to end
    const maxPosition = Math.max(...existingCards.map(c => c.position), 0);
    position = maxPosition + PositionManager['POSITION_GAP'];
  } else {
    // Insert at specific position
    const sortedCards = existingCards.sort((a, b) => a.position - b.position);
    const insertIndex = sortedCards.findIndex(c => c.position > position);
    
    if (insertIndex > 0) {
      const prevCard = sortedCards[insertIndex - 1];
      const nextCard = sortedCards[insertIndex];
      position = PositionManager.calculatePosition(prevCard?.position, nextCard?.position);
    }
  }

  // Create labels array with IDs
  const labels = (cardData.labels || []).map(labelName => ({
    id: `label_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: labelName,
    color: getRandomLabelColor()
  }));

  // Create card
  const cardId = await create(CARDS_COLLECTION, {
    title: cardData.title,
    description: cardData.description,
    listId,
    position,
    assignedTo: cardData.assignedTo || [],
    labels,
    dueDate: cardData.dueDate,
    priority: cardData.priority || 'medium',
    attachments: [],
    checklist: [],
    archived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const newCard = await find(CARDS_COLLECTION, { id: cardId });

  const response: ApiResponse<Card> = {
    success: true,
    data: newCard[0],
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] as string
  };

  res.status(201).json(response);
}

async function getCards(req: AuthenticatedRequest, res: NextApiResponse, listId: string) {
  const { includeArchived = 'false' } = req.query;
  
  let filter: any = { listId };
  if (includeArchived !== 'true') {
    filter.archived = false;
  }

  const cards = await find(CARDS_COLLECTION, filter);
  
  // Sort by position
  const sortedCards = cards.sort((a, b) => a.position - b.position);

  const response: ApiResponse<Card[]> = {
    success: true,
    data: sortedCards,
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
