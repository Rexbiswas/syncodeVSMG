import { describe, it, expect } from 'vitest';
import { CollaborationClient } from '../lib/collaboration-client';

describe('Frontend CollaborationClient Unit Tests', () => {
  it('initializes with disconnected state and manages local Y.Doc text', () => {
    let capturedContent = '';
    const client = new CollaborationClient({
      wsUrl: 'ws://localhost:4001/collaboration',
      token: 'fake-jwt-token',
      roomId: 'test-room-123',
      onDocChange: (content) => {
        capturedContent = content;
      },
    });

    expect(client.text.toString()).toBe('');

    // Insert text
    client.insertText(0, 'console.log("Hello Syncode");');
    expect(client.text.toString()).toBe('console.log("Hello Syncode");');
    expect(capturedContent).toBe('console.log("Hello Syncode");');

    // Delete text
    client.deleteText(0, 8); // delete 'console.'
    expect(client.text.toString()).toBe('log("Hello Syncode");');

    client.destroy();
  });

  it('updates awareness cursor position correctly', () => {
    const client = new CollaborationClient({
      wsUrl: 'ws://localhost:4001/collaboration',
      token: 'fake-jwt-token',
      roomId: 'test-room-123',
    });

    client.updateCursor(14, 25);
    const localState = client.awareness.getLocalState();
    expect(localState?.cursor).toEqual({ line: 14, column: 25 });

    client.destroy();
  });

  it('correctly maps awareness states to CollaborationParticipant objects', () => {
    const client = new CollaborationClient({
      wsUrl: 'ws://localhost:4001/collaboration',
      token: 'fake-jwt-token',
      roomId: 'test-room-123',
    });

    // Mock remote user awareness state in awareness instance
    client.awareness.setLocalState({
      user: {
        id: 'usr-1',
        username: 'alice',
        displayName: 'Alice Engineer',
        role: 'OWNER',
        color: '#6366f1',
      },
      cursor: { line: 5, column: 10 },
    });

    const participants = client.getParticipants();
    expect(participants.length).toBe(1);
    expect(participants[0].username).toBe('alice');
    expect(participants[0].role).toBe('OWNER');
    expect(participants[0].cursor).toEqual({ line: 5, column: 10 });

    client.destroy();
  });

  it('handles clean destruction and resource cleanup', () => {
    const client = new CollaborationClient({
      wsUrl: 'ws://localhost:4001/collaboration',
      token: 'fake-jwt-token',
      roomId: 'test-room-123',
    });

    expect(client.getIsDestroyed()).toBe(false);
    client.destroy();
    expect(client.getIsDestroyed()).toBe(true);
    expect(client.getStatus()).toBe('DISCONNECTED');
  });
});
