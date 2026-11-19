import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding.js';
import * as decoding from 'lib0/decoding.js';
import { getUserColor, COLLABORATION_PALETTE } from '@syncode/protocol';

describe('Collaboration Engine - Yjs CRDT & Awareness Primitives', () => {
  it('should initialize empty Y.Doc and apply text updates', () => {
    const doc = new Y.Doc();
    const ytext = doc.getText('content');
    expect(ytext.toString()).toBe('');

    ytext.insert(0, 'console.log("Hello SYNCODE");');
    expect(ytext.toString()).toBe('console.log("Hello SYNCODE");');
  });

  it('should compute state vector and perform two-step synchronization', () => {
    // Server doc has existing state
    const serverDoc = new Y.Doc();
    serverDoc.getText('content').insert(0, 'Initial code base');

    // New client doc connects empty
    const clientDoc = new Y.Doc();

    // Step 1: Client computes state vector (empty) and sends to server
    const clientVector = Y.encodeStateVector(clientDoc);

    // Step 2: Server computes diff from client's vector and client applies it
    const diff = Y.encodeStateAsUpdate(serverDoc, clientVector);
    Y.applyUpdate(clientDoc, diff);

    expect(clientDoc.getText('content').toString()).toBe('Initial code base');
  });

  it('should converge concurrent edits from two independent clients to identical state', () => {
    const docA = new Y.Doc();
    const docB = new Y.Doc();

    // Base synchronization
    docA.getText('content').insert(0, 'function compute() { return 42; }');
    const initUpdate = Y.encodeStateAsUpdate(docA);
    Y.applyUpdate(docB, initUpdate);

    // Client A edits at start
    docA.getText('content').insert(0, '// Client A comment\n');

    // Client B edits concurrently at end
    docB.getText('content').insert(docB.getText('content').length, '\n// Client B footer');

    // Exchange updates
    const updateA = Y.encodeStateAsUpdate(docA, Y.encodeStateVector(docB));
    const updateB = Y.encodeStateAsUpdate(docB, Y.encodeStateVector(docA));

    Y.applyUpdate(docB, updateA);
    Y.applyUpdate(docA, updateB);

    // CRDT Convergence Guarantee: docA and docB must be identical
    expect(docA.getText('content').toString()).toBe(docB.getText('content').toString());
    expect(docA.getText('content').toString()).toContain('Client A comment');
    expect(docA.getText('content').toString()).toContain('Client B footer');
  });

  it('should properly track and broadcast awareness states', () => {
    const doc = new Y.Doc();
    const awarenessA = new awarenessProtocol.Awareness(doc);
    const awarenessB = new awarenessProtocol.Awareness(doc);

    // Client A sets cursor position
    awarenessA.setLocalState({
      user: {
        id: 'user-a',
        username: 'alice',
        color: '#f43f5e',
      },
      cursor: { line: 5, character: 12 },
    });

    // Encode awareness update from A and apply to B
    const update = awarenessProtocol.encodeAwarenessUpdate(awarenessA, [awarenessA.clientID]);
    awarenessProtocol.applyAwarenessUpdate(awarenessB, update, 'origin-test');

    const stateB = awarenessB.getStates().get(awarenessA.clientID);
    expect(stateB).toBeDefined();
    expect(stateB?.user.username).toBe('alice');
    expect(stateB?.cursor.line).toBe(5);
    expect(stateB?.cursor.character).toBe(12);

    awarenessA.destroy();
    awarenessB.destroy();
  });

  it('should produce deterministic and accessible cursor colors for user IDs', () => {
    const color1 = getUserColor('user-alice-123');
    const color2 = getUserColor('user-alice-123');
    const color3 = getUserColor('user-bob-456');

    // Deterministic: Same user ID produces same color
    expect(color1).toBe(color2);
    expect(COLLABORATION_PALETTE).toContain(color1);
    expect(COLLABORATION_PALETTE).toContain(color3);
  });
});
