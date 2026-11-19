import { z } from 'zod';

/**
 * Collaboration Connection Query Schema
 */
export const joinCollaborationSchema = z.object({
  token: z.string().min(1, 'Access token is required'),
  roomId: z.string().uuid('Valid room UUID is required'),
  documentKey: z.string().min(1).default('default'),
});

export type JoinCollaborationParams = z.infer<typeof joinCollaborationSchema>;

/**
 * Cursor & Selection Validation Schema
 */
export const cursorPositionSchema = z.object({
  line: z.number().int().nonnegative(),
  character: z.number().int().nonnegative(),
});

export const cursorRangeSchema = z.object({
  start: cursorPositionSchema,
  end: cursorPositionSchema,
});

export const awarenessStateSchema = z.object({
  cursor: cursorPositionSchema.nullable().optional(),
  selection: cursorRangeSchema.nullable().optional(),
  activeFilePath: z.string().max(512).optional(),
});

export type ValidatedAwarenessState = z.infer<typeof awarenessStateSchema>;
