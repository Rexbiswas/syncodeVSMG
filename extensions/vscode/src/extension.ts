/**
 * SYNCODE VS Code Extension - Architectural Foundation (Phase 1)
 *
 * Implements extension lifecycle hooks. In Phase 2, this extension will integrate
 * @syncode/editor-adapter and connect to the real-time collaboration server.
 */

export interface ExtensionContextLike {
  subscriptions: { dispose(): void }[];
}

export function activate(context: ExtensionContextLike): void {
  // Foundation placeholder for Phase 2 command registration & editor listeners
  console.log('SYNCODE VS Code Extension activated in foundation mode.');
}

export function deactivate(): void {
  console.log('SYNCODE VS Code Extension deactivated.');
}

