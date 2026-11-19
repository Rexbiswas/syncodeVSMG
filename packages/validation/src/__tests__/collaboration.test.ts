import { describe, it, expect } from 'vitest';
import {
  joinCollaborationSchema,
  awarenessStateSchema,
  cursorPositionSchema,
  cursorRangeSchema,
} from '../collaboration.js';

describe('@syncode/validation - Collaboration Schemas', () => {
  it('should validate valid join collaboration parameters', () => {
    const valid = {
      token: 'jwt-access-token',
      roomId: '123e4567-e89b-12d3-a456-426614174000',
      documentKey: 'main.ts',
    };

    const result = joinCollaborationSchema.parse(valid);
    expect(result.token).toBe('jwt-access-token');
    expect(result.roomId).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(result.documentKey).toBe('main.ts');
  });

  it('should apply default documentKey when omitted', () => {
    const valid = {
      token: 'jwt-access-token',
      roomId: '123e4567-e89b-12d3-a456-426614174000',
    };

    const result = joinCollaborationSchema.parse(valid);
    expect(result.documentKey).toBe('default');
  });

  it('should reject invalid roomId in join parameters', () => {
    const invalid = {
      token: 'jwt-access-token',
      roomId: 'not-a-uuid',
    };

    expect(() => joinCollaborationSchema.parse(invalid)).toThrow();
  });

  it('should validate valid cursor position and range', () => {
    const pos = { line: 10, character: 5 };
    expect(cursorPositionSchema.parse(pos)).toEqual(pos);

    const range = {
      start: { line: 10, character: 5 },
      end: { line: 10, character: 15 },
    };
    expect(cursorRangeSchema.parse(range)).toEqual(range);
  });

  it('should reject negative cursor line or character', () => {
    expect(() => cursorPositionSchema.parse({ line: -1, character: 5 })).toThrow();
    expect(() => cursorPositionSchema.parse({ line: 1, character: -5 })).toThrow();
  });

  it('should validate awareness state with optional cursor and selection', () => {
    const state = {
      cursor: { line: 0, character: 0 },
      selection: null,
      activeFilePath: 'src/index.ts',
    };
    expect(awarenessStateSchema.parse(state)).toEqual(state);
  });
});
