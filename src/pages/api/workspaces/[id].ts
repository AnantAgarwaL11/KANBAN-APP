import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '../../../utils/auth';
import { withErrorHandling, Errors } from '../../../utils/errorHandler';
import { WorkspaceValidation } from '../../../utils/validation';
import { findById, update, deleteById } from '../../../utils/mockDatabase';
import { WORKSPACES_COLLECTION } from '../../../utils/constants';
import { UpdateWorkspaceRequest, ApiResponse, Workspace } from '../../../types/api';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { method } = req;
  const workspaceId = req.query.id as string;

  // Check workspace access
  const workspace = await findById(WORKSPACES_COLLECTION, workspaceId);
  if (!workspace) {
    throw Errors.notFound('Workspace');
  }

  const userMember = workspace.members.find(member => member.userId === req.user.userId);
  if (!userMember) {
    throw Errors.workspaceAccess();
  }

  switch (method) {
    case 'GET':
      return await getWorkspace(req, res, workspace);
    case 'PUT':
      return await updateWorkspace(req, res, workspace, userMember.role);
    case 'DELETE':
      return await deleteWorkspace(req, res, workspace, userMember.role);
    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      throw Errors.notFound('Endpoint');
  }
}

async function getWorkspace(req: AuthenticatedRequest, res: NextApiResponse, workspace: Workspace) {
  const response: ApiResponse<Workspace> = {
    success: true,
    data: workspace,
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] as string
  };

  res.status(200).json(response);
}

async function updateWorkspace(
  req: AuthenticatedRequest, 
  res: NextApiResponse, 
  workspace: Workspace, 
  userRole: string
) {
  // Only owners and admins can update workspace
  if (userRole !== 'owner' && userRole !== 'admin') {
    throw Errors.insufficientPermissions();
  }

  const updateData: UpdateWorkspaceRequest = req.body;

  // Validate input
  const validationErrors = WorkspaceValidation.update(updateData);
  if (validationErrors.length > 0) {
    throw Errors.validation(validationErrors);
  }

  // Update workspace
  const success = await update(WORKSPACES_COLLECTION, workspace.id, {
    ...updateData,
    updatedAt: new Date().toISOString()
  });

  if (!success) {
    throw new Error('Failed to update workspace');
  }

  // Get updated workspace
  const updatedWorkspace = await findById(WORKSPACES_COLLECTION, workspace.id);

  const response: ApiResponse<Workspace> = {
    success: true,
    data: updatedWorkspace,
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] as string
  };

  res.status(200).json(response);
}

async function deleteWorkspace(
  req: AuthenticatedRequest, 
  res: NextApiResponse, 
  workspace: Workspace, 
  userRole: string
) {
  // Only owners can delete workspace
  if (userRole !== 'owner') {
    throw Errors.insufficientPermissions();
  }

  const success = await deleteById(WORKSPACES_COLLECTION, workspace.id);

  if (!success) {
    throw new Error('Failed to delete workspace');
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
