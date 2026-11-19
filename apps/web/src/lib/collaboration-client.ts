import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding.js';
import * as decoding from 'lib0/decoding.js';
import {
  YJS_MSG_SYNC,
  YJS_MSG_AWARENESS,
  YJS_MSG_ROOM_INFO,
  YJS_MSG_ERROR,
  type CollaborationRoomInfoPayload,
  type CollaborationErrorPayload,
} from '@syncode/protocol';

export type ConnectionStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'RECONNECTING';

export interface CollaborationParticipant {
  clientId: number;
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  role: string;
  color: string;
  cursor?: {
    line: number;
    column: number;
  };
}

interface AwarenessUserState {
  id?: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string | null;
  role?: string;
  color?: string;
}

export interface CollaborationClientOptions {
  wsUrl: string;
  token: string;
  roomId: string;
  documentKey?: string;
  onStatusChange?: (status: ConnectionStatus) => void;
  onParticipantsChange?: (participants: CollaborationParticipant[]) => void;
  onRoomInfo?: (info: CollaborationRoomInfoPayload) => void;
  onError?: (error: CollaborationErrorPayload) => void;
  onDocChange?: (content: string) => void;
}

export class CollaborationClient {
  public readonly doc: Y.Doc;
  public readonly awareness: awarenessProtocol.Awareness;
  public readonly text: Y.Text;

  private ws: WebSocket | null = null;
  private status: ConnectionStatus = 'DISCONNECTED';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isDestroyed = false;

  private readonly options: CollaborationClientOptions;

  constructor(options: CollaborationClientOptions) {
    this.options = options;
    this.doc = new Y.Doc();
    this.awareness = new awarenessProtocol.Awareness(this.doc);
    this.text = this.doc.getText('content');

    // 1. Listen for local document changes to send binary sync updates to server
    this.doc.on('update', (update: Uint8Array, origin: unknown) => {
      if (origin !== 'remote' && this.ws && this.ws.readyState === WebSocket.OPEN) {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, YJS_MSG_SYNC);
        syncProtocol.writeUpdate(encoder, update);
        this.ws.send(encoding.toUint8Array(encoder));
      }
      this.options.onDocChange?.(this.text.toString());
    });

    // 2. Listen for local awareness changes (cursor / presence) to broadcast
    this.awareness.on(
      'update',
      ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }, origin: unknown) => {
        if (origin !== 'remote' && this.ws && this.ws.readyState === WebSocket.OPEN) {
          const changedClients = added.concat(updated, removed);
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, YJS_MSG_AWARENESS);
          encoding.writeVarUint8Array(
            encoder,
            awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients),
          );
          this.ws.send(encoding.toUint8Array(encoder));
        }

        this.notifyParticipants();
      },
    );
  }

  public connect(): void {
    if (this.isDestroyed) return;

    this.setStatus(this.reconnectAttempts > 0 ? 'RECONNECTING' : 'CONNECTING');

    const params = new URLSearchParams({
      token: this.options.token,
      roomId: this.options.roomId,
      documentKey: this.options.documentKey || 'default',
    });

    const fullUrl = `${this.options.wsUrl}?${params.toString()}`;

    try {
      this.ws = new WebSocket(fullUrl);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.setStatus('CONNECTED');

        // Send Sync Step 1: advertise our state vector
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, YJS_MSG_SYNC);
        syncProtocol.writeSyncStep1(encoder, this.doc);
        this.sendBinary(encoding.toUint8Array(encoder));

        // Send current local awareness state
        const localState = this.awareness.getLocalState();
        if (localState) {
          const awarenessEncoder = encoding.createEncoder();
          encoding.writeVarUint(awarenessEncoder, YJS_MSG_AWARENESS);
          encoding.writeVarUint8Array(
            awarenessEncoder,
            awarenessProtocol.encodeAwarenessUpdate(this.awareness, [this.awareness.clientID]),
          );
          this.sendBinary(encoding.toUint8Array(awarenessEncoder));
        }
      };

      this.ws.onmessage = (event: MessageEvent) => {
        if (!(event.data instanceof ArrayBuffer)) return;

        const uint8 = new Uint8Array(event.data);
        const decoder = decoding.createDecoder(uint8);
        const msgType = decoding.readVarUint(decoder);

        switch (msgType) {
          case YJS_MSG_ROOM_INFO: {
            const rawJson = decoding.readVarString(decoder);
            try {
              const info = JSON.parse(rawJson) as CollaborationRoomInfoPayload;
              this.options.onRoomInfo?.(info);
            } catch {
              // Ignore invalid JSON
            }
            break;
          }

          case YJS_MSG_ERROR: {
            const rawJson = decoding.readVarString(decoder);
            try {
              const err = JSON.parse(rawJson) as CollaborationErrorPayload;
              this.options.onError?.(err);
            } catch {
              // Ignore
            }
            break;
          }

          case YJS_MSG_SYNC: {
            const encoder = encoding.createEncoder();
            encoding.writeVarUint(encoder, YJS_MSG_SYNC);
            syncProtocol.readSyncMessage(decoder, encoder, this.doc, 'remote');
            if (encoding.length(encoder) > 1) {
              this.sendBinary(encoding.toUint8Array(encoder));
            }
            this.options.onDocChange?.(this.text.toString());
            break;
          }

          case YJS_MSG_AWARENESS: {
            const update = decoding.readVarUint8Array(decoder);
            awarenessProtocol.applyAwarenessUpdate(this.awareness, update, 'remote');
            break;
          }
        }
      };

      this.ws.onclose = (event: CloseEvent) => {
        this.setStatus('DISCONNECTED');
        if (!this.isDestroyed && this.reconnectAttempts < this.maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 8000);
          this.reconnectAttempts++;
          this.reconnectTimer = setTimeout(() => {
            this.connect();
          }, delay);
        } else if (event.code !== 1000) {
          this.setStatus('ERROR');
        }
      };

      this.ws.onerror = () => {
        this.setStatus('ERROR');
      };
    } catch {
      this.setStatus('ERROR');
    }
  }

  public insertText(index: number, content: string): void {
    this.text.insert(index, content);
  }

  public deleteText(index: number, length: number): void {
    this.text.delete(index, length);
  }

  public setContent(newContent: string): void {
    this.doc.transact(() => {
      this.text.delete(0, this.text.length);
      this.text.insert(0, newContent);
    });
  }

  public updateCursor(line: number, column: number): void {
    this.awareness.setLocalStateField('cursor', { line, column });
  }

  public getParticipants(): CollaborationParticipant[] {
    const participants: CollaborationParticipant[] = [];
    const states = this.awareness.getStates();

    states.forEach((state, clientId) => {
      if (state && typeof state === 'object' && 'user' in state) {
        const user = state.user as AwarenessUserState;
        participants.push({
          clientId,
          id: user.id || `client-${clientId}`,
          username: user.username || 'Anonymous',
          displayName: user.displayName || user.username || 'Anonymous',
          avatarUrl: user.avatarUrl,
          role: user.role || 'MEMBER',
          color: user.color || '#6366f1',
          cursor: state.cursor,
        });
      }
    });

    return participants;
  }

  private notifyParticipants(): void {
    this.options.onParticipantsChange?.(this.getParticipants());
  }

  private setStatus(newStatus: ConnectionStatus): void {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.options.onStatusChange?.(newStatus);
    }
  }

  private sendBinary(data: Uint8Array): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    }
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public getIsDestroyed(): boolean {
    return this.isDestroyed;
  }

  public destroy(): void {
    this.isDestroyed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.awareness.destroy();
    this.doc.destroy();
    this.setStatus('DISCONNECTED');
  }
}
