import { NextApiRequest, NextApiResponse } from 'next';
import { withBoardAccess, AuthenticatedRequest } from '../../../../utils/auth';
import { withErrorHandling, Errors } from '../../../../utils/errorHandler';
import { SearchEngine } from '../../../../utils/search';
import { SearchRequest, ApiResponse, SearchResult } from '../../../../types/api';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    throw Errors.notFound('Endpoint');
  }

  const boardId = req.query.id as string;
  const searchRequest: SearchRequest = req.body;

  // Validate search request
  if (!searchRequest.query || typeof searchRequest.query !== 'string') {
    throw Errors.validation([{
      field: 'query',
      message: 'Search query is required',
      code: 'MISSING_REQUIRED_FIELD'
    }]);
  }

  // Perform search
  const searchResult = await SearchEngine.searchCards(boardId, searchRequest);

  const response: ApiResponse<SearchResult> = {
    success: true,
    data: searchResult,
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] as string
  };

  res.status(200).json(response);
}

export default withErrorHandling(withBoardAccess(handler));
