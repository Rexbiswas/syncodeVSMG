/**
 * SYNCODE Universal Protocol Definitions
 */
export const PROTOCOL_VERSION = '1.0.0' as const;

export enum MessageType {
  // System & Connection
  PING = 'sys:ping',
  PONG = 'sys:pong',
  CLIENT_HANDSHAKE = 'sys:client_handshake',
  SERVER_HANDSHAKE = 'sys:server_handshake',
  ERROR = 'sys:error',

  // Session & Room
  ROOM_JOIN = 'room:join',
  ROOM_JOINED = 'room:joined',
  ROOM_LEAVE = 'room:leave',
  ROOM_USER_LEFT = 'room:user_left',

  // Presence & Awareness (Cursor, Selections)
  AWARENESS_UPDATE = 'awareness:update',

  // CRDT Document Sync
  DOC_SYNC_STEP1 = 'doc:sync_step1',
  DOC_SYNC_STEP2 = 'doc:sync_step2',
  DOC_UPDATE = 'doc:update',
}

// -----------------------------------------------------------------------------
// Phase 4: Binary Yjs WebSocket Message Codes
// (Compatible with y-protocols/sync and y-protocols/awareness)
// -----------------------------------------------------------------------------
export const YJS_MSG_SYNC = 0;
export const YJS_MSG_AWARENESS = 1;
export const YJS_MSG_AUTH = 2;
export const YJS_MSG_ROOM_INFO = 3;
export const YJS_MSG_ERROR = 4;

export const YJS_SYNC_STEP_1 = 0;
export const YJS_SYNC_STEP_2 = 1;
export const YJS_SYNC_UPDATE = 2;

// -----------------------------------------------------------------------------
// Phase 4: Error Codes & Payloads
// -----------------------------------------------------------------------------
export enum CollaborationErrorCode {
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  ROOM_NOT_FOUND = 'ROOM_NOT_FOUND',
  WORKSPACE_FORBIDDEN = 'WORKSPACE_FORBIDDEN',
  ROOM_FORBIDDEN = 'ROOM_FORBIDDEN',
  READ_ONLY_VIOLATION = 'READ_ONLY_VIOLATION',
  PAYLOAD_TOO_LARGE = 'PAYLOAD_TOO_LARGE',
  INVALID_PAYLOAD = 'INVALID_PAYLOAD',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SERVER_SHUTDOWN = 'SERVER_SHUTDOWN',
}

export interface CollaborationErrorPayload {
  code: CollaborationErrorCode;
  message: string;
  fatal: boolean;
}

export interface CollaborationRoomInfoPayload {
  roomId: string;
  documentKey: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  isReadOnly: boolean;
  userColor: string;
  participantCount: number;
}

// -----------------------------------------------------------------------------
// Phase 4: Deterministic Accessible Cursor Color Palette
// -----------------------------------------------------------------------------
export const COLLABORATION_PALETTE = [
  '#f43f5e', // rose-500
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ec4899', // pink-500
  '#3b82f6', // blue-500
  '#14b8a6', // teal-500
  '#a855f7', // purple-500
  '#eab308', // yellow-500
  '#6366f1', // indigo-500
  '#84cc16', // lime-500
] as const;

export function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % COLLABORATION_PALETTE.length;
  return COLLABORATION_PALETTE[index] ?? COLLABORATION_PALETTE[0];
}

// -----------------------------------------------------------------------------
// Presence & Awareness Interfaces
// -----------------------------------------------------------------------------
export interface CursorPosition {
  line: number;
  character: number;
}

export interface CursorRange {
  start: CursorPosition;
  end: CursorPosition;
}

export interface UserAwarenessPayload {
  userId: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string | null;
  role?: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  color?: string;
  cursor?: CursorPosition | null;
  selection?: CursorRange | null;
  activeFilePath?: string;
  lastUpdated?: number;
}

export interface RoomPresenceState {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  color: string;
  cursor?: CursorPosition | null;
  selection?: CursorRange | null;
  online: boolean;
  lastActive: number;
}

export interface RoomPresenceEvent {
  type: 'join' | 'leave' | 'update' | 'sync';
  roomId: string;
  participants: RoomPresenceState[];
  participantCount: number;
  user?: RoomPresenceState;
}

export interface ProtocolMessage<T = unknown> {
  version: typeof PROTOCOL_VERSION;
  id: string;
  type: MessageType;
  senderId?: string;
  roomId?: string;
  timestamp: number;
  payload: T;
}

export interface HandshakePayload {
  clientVersion: string;
  editor: 'vscode' | 'jetbrains' | 'neovim' | 'web';
  userId: string;
  userName: string;
}

export function createProtocolMessage<T>(
  type: MessageType,
  payload: T,
  options?: {
    senderId?: string;
    roomId?: string;
    id?: string;
  },
): ProtocolMessage<T> {
  return {
    version: PROTOCOL_VERSION,
    id: options?.id ?? `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    type,
    senderId: options?.senderId,
    roomId: options?.roomId,
    timestamp: Date.now(),
    payload,
  };
}

