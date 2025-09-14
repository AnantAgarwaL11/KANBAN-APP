// API Types and Interfaces for Mini-Trello

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  timestamp: string;
  requestId: string;
  meta?: {
    total?: number;
    limit?: number;
    offset?: number;
    hasMore?: boolean;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  notifications: boolean;
  defaultBoardColor: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  avatar?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UpdateUserRequest {
  name?: string;
  avatar?: string;
  preferences?: Partial<UserPreferences>;
}

// Workspace Types
export interface Workspace {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  members: WorkspaceMember[];
  settings: WorkspaceSettings;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  userId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

export interface WorkspaceSettings {
  visibility: 'private' | 'public';
  allowMemberInvites: boolean;
  defaultBoardVisibility: 'private' | 'workspace' | 'public';
}

export interface CreateWorkspaceRequest {
  name: string;
  description?: string;
  settings?: Partial<WorkspaceSettings>;
}

export interface UpdateWorkspaceRequest {
  name?: string;
  description?: string;
  settings?: Partial<WorkspaceSettings>;
}

export interface InviteMemberRequest {
  email: string;
  role: 'admin' | 'member';
}

// Board Types
export interface Board {
  id: string;
  title: string;
  description?: string;
  workspaceId?: string;
  ownerId: string;
  bgcolor: string;
  visibility: 'private' | 'workspace' | 'public';
  members: BoardMember[];
  settings: BoardSettings;
  createdAt: string;
  updatedAt: string;
}

export interface BoardMember {
  userId: string;
  role: 'owner' | 'member';
  joinedAt: string;
}

export interface BoardSettings {
  allowComments: boolean;
  cardCover: boolean;
  voting: boolean;
  selfJoin: boolean;
}

export interface CreateBoardRequest {
  title: string;
  description?: string;
  workspaceId?: string;
  bgcolor?: string;
  visibility?: 'private' | 'workspace' | 'public';
  settings?: Partial<BoardSettings>;
}

export interface UpdateBoardRequest {
  title?: string;
  description?: string;
  bgcolor?: string;
  visibility?: 'private' | 'workspace' | 'public';
  settings?: Partial<BoardSettings>;
}

export interface BoardWithLists extends Board {
  lists: ListWithCards[];
}

// List Types
export interface List {
  id: string;
  title: string;
  boardId: string;
  position: number;
  archived: boolean;
  settings: ListSettings;
  createdAt: string;
  updatedAt: string;
}

export interface ListSettings {
  wipLimit?: number;
  autoArchive: boolean;
}

export interface CreateListRequest {
  title: string;
  position?: number;
  settings?: Partial<ListSettings>;
}

export interface UpdateListRequest {
  title?: string;
  position?: number;
  settings?: Partial<ListSettings>;
  archived?: boolean;
}

export interface ListWithCards extends List {
  cards: Card[];
}

// Card Types
export interface Card {
  id: string;
  title: string;
  description?: string;
  listId: string;
  position: number;
  assignedTo: string[];
  labels: Label[];
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  attachments: Attachment[];
  checklist: ChecklistItem[];
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface LabelInput {
  id: string;
  name: string;
  color: string;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  assignedTo?: string;
}

export interface CreateCardRequest {
  title: string;
  description?: string;
  position?: number;
  assignedTo?: string[];
  labels?: string[];
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface UpdateCardRequest {
  title?: string;
  description?: string;
  position?: number;
  assignedTo?: string[];
  labels?: string[] | LabelInput[];
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
  archived?: boolean;
}

export interface MoveCardRequest {
  targetListId: string;
  position: number;
}

// Comment Types
export interface Comment {
  id: string;
  content: string;
  cardId: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommentRequest {
  content: string;
}

export interface UpdateCommentRequest {
  content: string;
}

// Activity Log Types
export interface Activity {
  id: string;
  type: ActivityType;
  description: string;
  userId: string;
  boardId?: string;
  entityId?: string;
  entityType?: 'card' | 'list' | 'board' | 'comment';
  metadata: Record<string, any>;
  createdAt: string;
}

export interface CreateActivityRequest {
  type: ActivityType;
  description: string;
  boardId?: string;
  entityId?: string;
  entityType?: 'card' | 'list' | 'board' | 'comment';
  metadata?: Record<string, any>;
}

export enum ActivityType {
  // Board activities
  BOARD_CREATED = 'board_created',
  BOARD_UPDATED = 'board_updated',
  BOARD_MEMBER_ADDED = 'board_member_added',
  BOARD_MEMBER_REMOVED = 'board_member_removed',
  
  // List activities
  LIST_CREATED = 'list_created',
  LIST_UPDATED = 'list_updated',
  LIST_MOVED = 'list_moved',
  LIST_ARCHIVED = 'list_archived',
  
  // Card activities
  CARD_CREATED = 'card_created',
  CARD_UPDATED = 'card_updated',
  CARD_MOVED = 'card_moved',
  CARD_ASSIGNED = 'card_assigned',
  CARD_UNASSIGNED = 'card_unassigned',
  CARD_LABELED = 'card_labeled',
  CARD_UNLABELED = 'card_unlabeled',
  CARD_DUE_DATE_SET = 'card_due_date_set',
  CARD_DUE_DATE_REMOVED = 'card_due_date_removed',
  CARD_ARCHIVED = 'card_archived',
  CARD_RESTORED = 'card_restored',
  
  // Comment activities
  COMMENT_ADDED = 'comment_added',
  COMMENT_UPDATED = 'comment_updated',
  COMMENT_DELETED = 'comment_deleted',
  
  // Attachment activities
  ATTACHMENT_ADDED = 'attachment_added',
  ATTACHMENT_REMOVED = 'attachment_removed',
  
  // Checklist activities
  CHECKLIST_ITEM_ADDED = 'checklist_item_added',
  CHECKLIST_ITEM_COMPLETED = 'checklist_item_completed',
  CHECKLIST_ITEM_UNCOMPLETED = 'checklist_item_uncompleted',
}

// Search Types
export interface SearchRequest {
  query: string;
  filters?: SearchFilters;
  pagination?: {
    page: number;
    limit: number;
  };
}

export interface SearchFilters {
  labels?: string[];
  assignees?: string[];
  dueDate?: {
    from?: string;
    to?: string;
  };
  priority?: ('low' | 'medium' | 'high')[];
  archived?: boolean;
}

export interface SearchResult {
  cards: Card[];
  total: number;
}

// Error Types
export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  
  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  INVALID_EMAIL = 'INVALID_EMAIL',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  
  // Resources
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  DUPLICATE_EMAIL = 'DUPLICATE_EMAIL',
  RESOURCE_LIMIT_EXCEEDED = 'RESOURCE_LIMIT_EXCEEDED',
  
  // Permissions
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  BOARD_ACCESS_DENIED = 'BOARD_ACCESS_DENIED',
  WORKSPACE_ACCESS_DENIED = 'WORKSPACE_ACCESS_DENIED',
  
  // System
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// JWT Types
export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  iat: number;
  exp: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Position Types
export interface PositionUpdate {
  id: string;
  position: number;
}

export interface BulkPositionUpdate {
  updates: PositionUpdate[];
}
