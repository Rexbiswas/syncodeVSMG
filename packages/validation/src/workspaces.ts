import { z } from 'zod';

// ============================================================================
// Enums
// ============================================================================

export const WorkspaceRole = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
  VIEWER: 'VIEWER',
} as const;
export type WorkspaceRole = (typeof WorkspaceRole)[keyof typeof WorkspaceRole];

export const WorkspaceVisibility = {
  PRIVATE: 'PRIVATE',
  PUBLIC: 'PUBLIC',
} as const;
export type WorkspaceVisibility =
  (typeof WorkspaceVisibility)[keyof typeof WorkspaceVisibility];

export const InvitationStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REVOKED: 'REVOKED',
  EXPIRED: 'EXPIRED',
} as const;
export type InvitationStatus =
  (typeof InvitationStatus)[keyof typeof InvitationStatus];

export const RoomVisibility = {
  PRIVATE: 'PRIVATE',
  PUBLIC: 'PUBLIC',
} as const;
export type RoomVisibility =
  (typeof RoomVisibility)[keyof typeof RoomVisibility];

// Slug regex: lowercase letters, numbers, and single hyphens
export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// ============================================================================
// Request Schemas
// ============================================================================

export const createWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Workspace name must be at least 2 characters')
    .max(50, 'Workspace name must not exceed 50 characters'),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, 'Workspace slug must be at least 2 characters')
    .max(50, 'Workspace slug must not exceed 50 characters')
    .regex(
      SLUG_REGEX,
      'Slug can only contain lowercase alphanumeric characters and hyphens',
    ),
  description: z
    .string()
    .trim()
    .max(300, 'Description must not exceed 300 characters')
    .optional()
    .nullable(),
  visibility: z
    .nativeEnum(WorkspaceVisibility)
    .default(WorkspaceVisibility.PRIVATE),
});
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;

export const updateWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Workspace name must be at least 2 characters')
    .max(50, 'Workspace name must not exceed 50 characters')
    .optional(),
  description: z
    .string()
    .trim()
    .max(300, 'Description must not exceed 300 characters')
    .optional()
    .nullable(),
  visibility: z.nativeEnum(WorkspaceVisibility).optional(),
});
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;

export const transferOwnershipSchema = z.object({
  newOwnerId: z.string().uuid('Valid user ID is required'),
});
export type TransferOwnershipInput = z.infer<typeof transferOwnershipSchema>;

export const changeMemberRoleSchema = z.object({
  role: z.enum([
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
    WorkspaceRole.VIEWER,
  ], {
    errorMap: () => ({ message: 'Role must be ADMIN, MEMBER, or VIEWER' }),
  }),
});
export type ChangeMemberRoleInput = z.infer<typeof changeMemberRoleSchema>;

export const createInvitationSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address'),
  role: z
    .enum([WorkspaceRole.ADMIN, WorkspaceRole.MEMBER, WorkspaceRole.VIEWER], {
      errorMap: () => ({ message: 'Invitation role must be ADMIN, MEMBER, or VIEWER' }),
    })
    .default(WorkspaceRole.MEMBER),
});
export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;

export const createRoomSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Room name must be at least 2 characters')
    .max(50, 'Room name must not exceed 50 characters'),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, 'Room slug must be at least 2 characters')
    .max(50, 'Room slug must not exceed 50 characters')
    .regex(
      SLUG_REGEX,
      'Slug can only contain lowercase alphanumeric characters and hyphens',
    ),
  description: z
    .string()
    .trim()
    .max(300, 'Description must not exceed 300 characters')
    .optional()
    .nullable(),
  visibility: z.nativeEnum(RoomVisibility).default(RoomVisibility.PRIVATE),
});
export type CreateRoomInput = z.infer<typeof createRoomSchema>;

export const updateRoomSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Room name must be at least 2 characters')
    .max(50, 'Room name must not exceed 50 characters')
    .optional(),
  description: z
    .string()
    .trim()
    .max(300, 'Description must not exceed 300 characters')
    .optional()
    .nullable(),
  visibility: z.nativeEnum(RoomVisibility).optional(),
});
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;

// ============================================================================
// Response Types
// ============================================================================

export interface WorkspaceItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  ownerId: string;
  visibility: WorkspaceVisibility;
  role: WorkspaceRole;
  createdAt: string;
  updatedAt: string;
  _count?: {
    members: number;
    rooms: number;
  };
}

export interface WorkspaceDetail extends WorkspaceItem {
  owner: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    email: string;
  };
  currentUserRole: WorkspaceRole;
}

export interface WorkspaceMemberItem {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: string;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    email: string;
  };
}

export interface WorkspaceInvitationItem {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  status: InvitationStatus;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
  invitedBy: {
    id: string;
    username: string;
    displayName: string | null;
  };
}

export interface RoomItem {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  description: string | null;
  createdById: string;
  visibility: RoomVisibility;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    username: string;
    displayName: string | null;
  };
}
