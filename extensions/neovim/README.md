# SYNCODE Neovim Plugin Foundation

## Architecture Overview
The SYNCODE Neovim plugin enables terminal and modal editing power users to participate in synchronized sessions alongside VS Code and JetBrains developers.

### Integration Design
1. **Buffer Event Hooks**:
   - `nvim_buf_attach`: Hooks into buffer modification events (`on_lines`, `on_bytes`) to capture micro-deltas without latency.
   - `CursorMoved` & `CursorMovedI` autocommands: Transmits live cursor line and column coordinates.
2. **Visual Extmarks & Namespaces**:
   - `nvim_buf_set_extmark`: Injects virtual text annotations and highlight groups displaying collaborator names, cursor lines, and selections in real-time.
3. **RPC Client Bridge**:
   - Uses Neovim's asynchronous `vim.loop` / `uv` networking or a lightweight background Node.js RPC daemon to stream protocol messages.

