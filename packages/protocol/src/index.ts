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
  cursor?: CursorPosition;
  selection?: CursorRange;
  activeFilePath?: string;
  color?: string;
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

