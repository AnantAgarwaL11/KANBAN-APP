import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest, AuthUtils } from '../../../utils/auth';
import { withErrorHandling } from '../../../utils/errorHandler';
import { ApiResponse } from '../../../types/api';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] as string
    });
  }

  // Clear auth cookies
  AuthUtils.clearAuthCookies(res);

  const response: ApiResponse<{ loggedOut: boolean }> = {
    success: true,
    data: { loggedOut: true },
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] as string
  };

  res.status(200).json(response);
}

export default withErrorHandling(withAuth(handler));
