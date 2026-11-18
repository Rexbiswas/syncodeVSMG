import { describe, it, expect } from 'vitest';
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  transferOwnershipSchema,
  changeMemberRoleSchema,
  createInvitationSchema,
  createRoomSchema,
  WorkspaceRole,
  WorkspaceVisibility,
  RoomVisibility,
} from '../workspaces.js';

describe('Workspace Validation Schemas', () => {
  describe('createWorkspaceSchema', () => {
    it('accepts valid workspace input', () => {
      const result = createWorkspaceSchema.safeParse({
        name: 'Alpha Team',
        slug: 'alpha-team',
        description: 'Primary project workspace',
        visibility: WorkspaceVisibility.PRIVATE,
      });
      expect(result.success).toBe(true);
    });

    it('rejects names with less than 2 characters', () => {
      const result = createWorkspaceSchema.safeParse({
        name: 'A',
        slug: 'alpha-team',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid slugs with uppercase or special characters', () => {
      const result = createWorkspaceSchema.safeParse({
        name: 'Alpha Team',
        slug: 'Alpha_Team!',
      });
      expect(result.success).toBe(false);
    });

    it('defaults visibility to PRIVATE', () => {
      const result = createWorkspaceSchema.safeParse({
        name: 'Dev Workspace',
        slug: 'dev-workspace',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.visibility).toBe(WorkspaceVisibility.PRIVATE);
      }
    });
  });

  describe('updateWorkspaceSchema', () => {
    it('allows updating name, description, and visibility', () => {
      const result = updateWorkspaceSchema.safeParse({
        name: 'Updated Name',
        description: 'New description',
        visibility: WorkspaceVisibility.PUBLIC,
      });
      expect(result.success).toBe(true);
    });

    it('allows empty update', () => {
      const result = updateWorkspaceSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('transferOwnershipSchema', () => {
    it('accepts valid UUID newOwnerId', () => {
      const result = transferOwnershipSchema.safeParse({
        newOwnerId: '123e4567-e89b-12d3-a456-426614174000',
      });
      expect(result.success).toBe(true);
    });

    it('rejects non-UUID newOwnerId', () => {
      const result = transferOwnershipSchema.safeParse({
        newOwnerId: 'invalid-id',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('changeMemberRoleSchema', () => {
    it('accepts valid roles: ADMIN, MEMBER, VIEWER', () => {
      expect(changeMemberRoleSchema.safeParse({ role: WorkspaceRole.ADMIN }).success).toBe(true);
      expect(changeMemberRoleSchema.safeParse({ role: WorkspaceRole.MEMBER }).success).toBe(true);
      expect(changeMemberRoleSchema.safeParse({ role: WorkspaceRole.VIEWER }).success).toBe(true);
    });

    it('rejects OWNER role (cannot promote to OWNER via changeRole)', () => {
      expect(changeMemberRoleSchema.safeParse({ role: WorkspaceRole.OWNER }).success).toBe(false);
    });
  });

  describe('createInvitationSchema', () => {
    it('accepts valid email and role', () => {
      const result = createInvitationSchema.safeParse({
        email: 'collaborator@syncode.dev',
        role: WorkspaceRole.ADMIN,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('collaborator@syncode.dev');
      }
    });

    it('defaults role to MEMBER', () => {
      const result = createInvitationSchema.safeParse({
        email: 'member@syncode.dev',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe(WorkspaceRole.MEMBER);
      }
    });

    it('rejects invalid email', () => {
      const result = createInvitationSchema.safeParse({
        email: 'not-an-email',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createRoomSchema', () => {
    it('accepts valid room input', () => {
      const result = createRoomSchema.safeParse({
        name: 'Backend API Room',
        slug: 'backend-api-room',
        description: 'Real-time room for API development',
        visibility: RoomVisibility.PRIVATE,
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid room slug', () => {
      const result = createRoomSchema.safeParse({
        name: 'Room 1',
        slug: 'Room 1 Invalid',
      });
      expect(result.success).toBe(false);
    });
  });
});
