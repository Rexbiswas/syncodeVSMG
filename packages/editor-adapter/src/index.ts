import { CursorPosition, CursorRange } from '@syncode/protocol';

export type EditorType = 'vscode' | 'jetbrains' | 'neovim' | 'web';

export interface EditorCapabilities {
  supportsMultipleCursors: boolean;
  supportsSelections: boolean;
  supportsDiagnostics: boolean;
  supportsVirtualFileSystem: boolean;
}

export interface EditorDocumentSnapshot {
  uri: string;
  languageId: string;
  version: number;
  content: string;
}

export interface EditorTextChange {
  range: CursorRange;
  text: string;
}

export interface ConnectionOptions {
  serverUrl: string;
  roomId: string;
  token?: string;
}

export interface IEditorAdapter {
  readonly type: EditorType;
  readonly capabilities: EditorCapabilities;

  connect(options: ConnectionOptions): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  applyRemoteChange(change: EditorTextChange): Promise<void>;
  setRemoteCursor(userId: string, position: CursorPosition, color?: string): void;
  clearRemoteCursor(userId: string): void;
}

/**
 * Base abstract class providing common state and event boilerplate for editor adapters
 */
export abstract class BaseEditorAdapter implements IEditorAdapter {
  public abstract readonly type: EditorType;
  public abstract readonly capabilities: EditorCapabilities;

  protected connected = false;
  protected currentOptions?: ConnectionOptions;

  public isConnected(): boolean {
    return this.connected;
  }

  public abstract connect(options: ConnectionOptions): Promise<void>;
  public abstract disconnect(): Promise<void>;
  public abstract applyRemoteChange(change: EditorTextChange): Promise<void>;
  public abstract setRemoteCursor(userId: string, position: CursorPosition, color?: string): void;
  public abstract clearRemoteCursor(userId: string): void;
}

