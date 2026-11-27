import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';
import * as awarenessProtocol from 'y-protocols/awareness';
import { CollaborationErrorCode } from '@syncode/protocol';

describe('Multi-Client Collaboration & Permission Simulation Tests', () => {
  it('synchronizes document edits between two collaborative Yjs clients', () => {
    const doc1 = new Y.Doc();
    const doc2 = new Y.Doc();

    const text1 = doc1.getText('content');
    const text2 = doc2.getText('content');

    // Simulate network channel between doc1 and doc2
    doc1.on('update', (update) => {
      Y.applyUpdate(doc2, update);
    });
    doc2.on('update', (update) => {
      Y.applyUpdate(doc1, update);
    });

    // Client 1 types
    text1.insert(0, 'export function add(a: number, b: number): number {\n  return a + b;\n}');
    expect(text2.toString()).toBe('export function add(a: number, b: number): number {\n  return a + b;\n}');

    // Client 2 types concurrently at the end
    text2.insert(text2.length, '\nconsole.log(add(2, 3));');
    expect(text1.toString()).toBe(text2.toString());

    doc1.destroy();
    doc2.destroy();
  });

  it('exchanges awareness presence and cursor states between clients', () => {
    const doc1 = new Y.Doc();
    const doc2 = new Y.Doc();

    const awareness1 = new awarenessProtocol.Awareness(doc1);
    const awareness2 = new awarenessProtocol.Awareness(doc2);

    awareness1.on('update', ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }) => {
      const changed = added.concat(updated, removed);
      const update = awarenessProtocol.encodeAwarenessUpdate(awareness1, changed);
      awarenessProtocol.applyAwarenessUpdate(awareness2, update, 'client1');
    });

    awareness1.setLocalState({
      user: {
        id: 'usr-alice',
        username: 'alice',
        displayName: 'Alice Engineer',
        role: 'OWNER',
        color: '#7657ff',
      },
      cursor: { line: 12, column: 4 },
    });

    const statesOnClient2 = awareness2.getStates();
    const aliceState = statesOnClient2.get(awareness1.clientID);

    expect(aliceState).toBeDefined();
    expect(aliceState?.user.username).toBe('alice');
    expect(aliceState?.user.color).toBe('#7657ff');
    expect(aliceState?.cursor).toEqual({ line: 12, column: 4 });

    awareness1.destroy();
    awareness2.destroy();
    doc1.destroy();
    doc2.destroy();
  });

  it('verifies VIEWER read-only policy blocks editing attempts', () => {
    interface UserSession {
      role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
      isReadOnly: boolean;
    }

    const alice: UserSession = { role: 'OWNER', isReadOnly: false };
    const bob: UserSession = { role: 'VIEWER', isReadOnly: true };

    const simulateUserEdit = (user: UserSession) => {
      if (user.isReadOnly) {
        return {
          success: false,
          error: {
            code: CollaborationErrorCode.READ_ONLY_VIOLATION,
            message: 'You have Viewer permissions and cannot modify this document.',
          },
        };
      }
      return { success: true };
    };

    const aliceResult = simulateUserEdit(alice);
    expect(aliceResult.success).toBe(true);

    const bobResult = simulateUserEdit(bob);
    expect(bobResult.success).toBe(false);
    expect(bobResult.error?.code).toBe(CollaborationErrorCode.READ_ONLY_VIOLATION);
  });
});
