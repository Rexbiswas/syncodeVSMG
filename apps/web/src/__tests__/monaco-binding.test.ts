import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';
import type * as monacoType from 'monaco-editor';
import { createMutex, MonacoYjsBinding } from '../lib/monaco-yjs-binding';

describe('Monaco Yjs Collaborative Binding Tests', () => {
  it('creates an effective re-entrant mutex preventing recursive execution', () => {
    const mux = createMutex();
    let count = 0;
    let recursiveAttemptBlocked = false;

    mux(() => {
      count++;
      mux(() => {
        recursiveAttemptBlocked = true;
        count++;
      });
    });

    expect(count).toBe(1);
    expect(recursiveAttemptBlocked).toBe(false);
  });

  it('synchronizes initial content from Y.Text into Monaco model', () => {
    const doc = new Y.Doc();
    const ytext = doc.getText('content');
    ytext.insert(0, 'const greeting = "Hello Syncode";');

    let modelValue = '';
    const mockModel = {
      getValue: () => modelValue,
      setValue: (val: string) => {
        modelValue = val;
      },
      applyEdits: () => {},
      onDidChangeContent: () => ({ dispose: () => {} }),
      onWillDispose: () => ({ dispose: () => {} }),
      getPositionAt: (offset: number) => ({ lineNumber: 1, column: offset + 1 }),
      getOffsetAt: () => 0,
    } as unknown as monacoType.editor.ITextModel;

    const mockMonaco = {
      Range: class {
        constructor(public startLine: number, public startCol: number, public endLine: number, public endCol: number) {}
      },
      Selection: class {
        constructor(public startLine: number, public startCol: number, public endLine: number, public endCol: number) {}
      },
    } as unknown as typeof monacoType;

    const binding = new MonacoYjsBinding(ytext, mockModel, new Set(), null, mockMonaco);
    expect(modelValue).toBe('const greeting = "Hello Syncode";');

    binding.destroy();
    doc.destroy();
  });

  it('propagates Yjs remote updates into Monaco model edits', () => {
    const doc = new Y.Doc();
    const ytext = doc.getText('content');
    ytext.insert(0, 'Initial code');

    const appliedEdits: Array<{ text: string }> = [];
    const mockModel = {
      getValue: () => 'Initial code',
      setValue: () => {},
      applyEdits: (edits: Array<{ text: string }>) => {
        appliedEdits.push(...edits);
      },
      onDidChangeContent: () => ({ dispose: () => {} }),
      onWillDispose: () => ({ dispose: () => {} }),
      getPositionAt: (offset: number) => ({ lineNumber: 1, column: offset + 1 }),
      getOffsetAt: () => 0,
    } as unknown as monacoType.editor.ITextModel;

    const mockMonaco = {
      Range: class {
        constructor(public startLine: number, public startCol: number, public endLine: number, public endCol: number) {}
      },
      Selection: class {
        constructor(public startLine: number, public startCol: number, public endLine: number, public endCol: number) {}
      },
    } as unknown as typeof monacoType;

    const binding = new MonacoYjsBinding(ytext, mockModel, new Set(), null, mockMonaco);

    // Perform remote update on Y.Text
    ytext.insert(12, ' - Real-Time Collaboration');
    expect(appliedEdits.length).toBeGreaterThan(0);
    expect(appliedEdits[0].text).toBe(' - Real-Time Collaboration');

    binding.destroy();
    doc.destroy();
  });
});
