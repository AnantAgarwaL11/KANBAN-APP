import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '../../../utils/auth';
import { withErrorHandling, Errors } from '../../../utils/errorHandler';
import { WorkspaceValidation } from '../../../utils/validation';
import { create, find } from '../../../utils/mockDatabase';
import { WORKSPACES_COLLECTION } from '../../../utils/constants';
import { CreateWorkspaceRequest, ApiResponse, Workspace } from '../../../types/api';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { method } = req;

  switch (method) {
    case 'POST':
      return await createWorkspace(req, res);
    case 'GET':
      return await getWorkspaces(req, res);
    default:
      res.setHeader('Allow', ['POST', 'GET']);
      throw Errors.notFound('Endpoint');
  }
}

async function createWorkspace(req: AuthenticatedRequest, res: NextApiResponse) {
  const workspaceData: CreateWorkspaceRequest = req.body;

  // Validate input
  const validationErrors = WorkspaceValidation.create(workspaceData);
  if (validationErrors.length > 0) {
    throw Errors.validation(validationErrors);
  }

  // Create workspace
  const workspaceId = await create(WORKSPACES_COLLECTION, {
    name: workspaceData.name,
    description: workspaceData.description,
    ownerId: req.user.userId,
    members: [{
      userId: req.user.userId,
      role: 'owner',
      joinedAt: new Date().toISOString()
    }],
    settings: {
      visibility: 'private',
      allowMemberInvites: false,
      defaultBoardVisibility: 'workspace',
      ...workspaceData.settings
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const workspace = await find(WORKSPACES_COLLECTION, { id: workspaceId });

  const response: ApiResponse<Workspace> = {
    success: true,
    data: workspace[0],
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] as string
  };

  res.status(201).json(response);
}

async function getWorkspaces(req: AuthenticatedRequest, res: NextApiResponse) {
  // Get workspaces where user is a member
  const workspaces = await find(WORKSPACES_COLLECTION, {});
  
  const userWorkspaces = workspaces.filter(workspace => 
    workspace.members.some(member => member.userId === req.user.userId)
  );

  const response: ApiResponse<Workspace[]> = {
    success: true,
    data: userWorkspaces,
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] as string
  };

  res.status(200).json(response);
}

export default withErrorHandling(withAuth(handler));
