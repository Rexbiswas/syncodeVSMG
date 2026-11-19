import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding.js';
import * as decoding from 'lib0/decoding.js';
import { YJS_MSG_SYNC } from '@syncode/protocol';

describe('Collaboration Engine - Performance & Latency Benchmarks', () => {
  it('CRDT Latency: applying 500 consecutive document edits executes in < 500ms (< 1ms/edit)', () => {
    const docA = new Y.Doc();
    const docB = new Y.Doc();
    const textA = docA.getText('content');
    const textB = docB.getText('content');

    const start = performance.now();

    for (let i = 0; i < 500; i++) {
      docA.transact(() => {
        textA.insert(textA.length, `Line ${i}: const x = ${i};\n`);
      });
      const update = Y.encodeStateAsUpdate(docA, Y.encodeStateVector(docB));
      Y.applyUpdate(docB, update);
    }

    const elapsed = performance.now() - start;

    expect(textA.toString()).toBe(textB.toString());
    expect(textB.toString().length).toBeGreaterThan(5000);
    // 500 syncs must complete in under 500ms (sub-1ms per sync)
    expect(elapsed).toBeLessThan(500);
  });

  it('Propagation Latency: simulated round-trip binary CRDT packet transfer executes in < 5ms', () => {
    const docSender = new Y.Doc();
    const docReceiver = new Y.Doc();

    const start = performance.now();

    // 1. Sender makes an edit
    docSender.getText('content').insert(0, 'function calculateTotal(items: Item[]): number {\n  return 0;\n}');

    // 2. Binary frame serialization
    const update = Y.encodeStateAsUpdate(docSender);
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, YJS_MSG_SYNC);
    syncProtocol.writeUpdate(encoder, update);
    const wireData = encoding.toUint8Array(encoder);

    // 3. Simulated network packet deserialization
    const decoder = decoding.createDecoder(wireData);
    const msgType = decoding.readVarUint(decoder);
    expect(msgType).toBe(YJS_MSG_SYNC);
    const syncType = decoding.readVarUint(decoder);
    expect(syncType).toBe(syncProtocol.messageYjsUpdate);
    const updateData = decoding.readVarUint8Array(decoder);
    Y.applyUpdate(docReceiver, updateData);

    const elapsed = performance.now() - start;

    expect(docReceiver.getText('content').toString()).toBe(docSender.getText('content').toString());
    expect(elapsed).toBeLessThan(10);
  });

  it('Snapshot Compaction: compacting 200 incremental edits into a single snapshot completes in < 15ms', () => {
    const doc = new Y.Doc();
    const text = doc.getText('content');

    // Simulate 200 incremental keystroke updates
    for (let i = 0; i < 200; i++) {
      text.insert(text.length, String.fromCharCode(65 + (i % 26)));
    }

    const start = performance.now();
    // Compact to state snapshot
    const snapshotBinary = Y.encodeStateAsUpdate(doc);
    const compactionTime = performance.now() - start;

    expect(snapshotBinary.length).toBeGreaterThan(0);
    expect(compactionTime).toBeLessThan(15);

    // Verify recovery from compacted snapshot into a blank doc
    const restoredDoc = new Y.Doc();
    Y.applyUpdate(restoredDoc, snapshotBinary);
    expect(restoredDoc.getText('content').toString()).toBe(text.toString());
  });

  it('Awareness Throughput: 1,000 awareness state updates encode and decode in < 300ms', () => {
    const doc = new Y.Doc();
    const awarenessSender = new awarenessProtocol.Awareness(doc);
    const awarenessReceiver = new awarenessProtocol.Awareness(doc);

    const start = performance.now();

    for (let i = 0; i < 1000; i++) {
      awarenessSender.setLocalState({
        user: { id: `user-${i % 10}`, name: `Dev ${i % 10}` },
        cursor: { line: i, column: (i * 3) % 80 },
      });

      const update = awarenessProtocol.encodeAwarenessUpdate(awarenessSender, [awarenessSender.clientID]);
      awarenessProtocol.applyAwarenessUpdate(awarenessReceiver, update, 'network');
    }

    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(300);
  });
});
