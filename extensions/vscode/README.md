# SYNCODE VS Code Extension Foundation

## Architecture Overview
The SYNCODE VS Code extension acts as a client-side bridge between the Visual Studio Code text editor API and the SYNCODE Universal Real-Time Collaboration infrastructure.

### Integration Design
1. **Editor Event Capture**:
   - `vscode.workspace.onDidChangeTextDocument`: Captures local edit deltas and maps them to CRDT text insertions/deletions.
   - `vscode.window.onDidChangeTextEditorSelection`: Captures local cursor and selection movements to broadcast remote awareness.
2. **Remote Decoration Rendering**:
   - `vscode.window.createTextEditorDecorationType`: Renders colored remote participant cursors and named presence flags in the editor gutter.
3. **Synchronization Lifecycle**:
   - Communicates via WebSocket directly with `apps/collaboration` using the `@syncode/protocol` message contract.

