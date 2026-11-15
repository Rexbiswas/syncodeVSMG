import { describe, it, expect } from 'vitest';
import { BaseEditorAdapter, EditorCapabilities, ConnectionOptions, EditorType } from '../index.js';

class MockAdapter extends BaseEditorAdapter {
  public readonly type: EditorType = 'vscode';
  public readonly capabilities: EditorCapabilities = {
    supportsMultipleCursors: true,
    supportsSelections: true,
    supportsDiagnostics: true,
    supportsVirtualFileSystem: true,
  };

  async connect(options: ConnectionOptions): Promise<void> {
    this.currentOptions = options;
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async applyRemoteChange(): Promise<void> {}
  setRemoteCursor(): void {}
  clearRemoteCursor(): void {}
}

describe('@syncode/editor-adapter - Base Adapter', () => {
  it('should initialize and manage connection state properly', async () => {
    const adapter = new MockAdapter();
    expect(adapter.isConnected()).toBe(false);
    expect(adapter.capabilities.supportsMultipleCursors).toBe(true);

    await adapter.connect({ serverUrl: 'ws://localhost:4001', roomId: 'test-room' });
    expect(adapter.isConnected()).toBe(true);

    await adapter.disconnect();
    expect(adapter.isConnected()).toBe(false);
  });
});

