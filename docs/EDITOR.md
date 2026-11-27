# SYNCODE — Phase 5: Browser-Based Code Editor

## 1. Overview & Objective

Phase 5 introduces a production-grade, browser-based coding environment inside SYNCODE rooms. Built upon Microsoft's Monaco Editor and directly integrated with the Phase 4 Yjs real-time collaboration engine, the editor supports zero-latency collaborative coding, shared cursors, remote selection highlights, multiple file tabs, custom dark IDE styling, and strict role-based access control.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SYNCODE Room Detail View                        │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │  Breadcrumbs / Room Header (#slug, Visibility, Role, Sync Status)  │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │  Editor Tab Bar: [main.ts ×] [types.ts ×] [+]   Language | Wrap | ⚙ │ │
│ ├───────────────────────────────────────────────────────┬────────────┤ │
│ │                                                       │            │ │
│ │               Monaco Code Editor                      │Collaborator│ │
│ │   - Custom `syncode-dark` theme                       │   Roster   │ │
│ │   - 21 Supported Languages                            │            │ │
│ │   - Shared Cursors & Selection Highlights             │- Alice (Ln)│ │
│ │   - Relative Position Tracking                        │- Bob (Ln)  │ │
│ │   - Word Wrap (Alt+Z) & Code Formatting               │            │ │
│ │   - Read-only enforcement for VIEWERS                 │            │ │
│ │                                                       │            │ │
│ ├───────────────────────────────────────────────────────┴────────────┤ │
│ │  Status Bar: #slug | Yjs CRDT Active | Ln 1, Col 1 | UTF-8 | TS    │ │
│ └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Architecture & Components

### 2.1 Monaco-Yjs Synchronization (`MonacoYjsBinding`)
Located in `apps/web/src/lib/monaco-yjs-binding.ts`, this native TypeScript binding provides bidirectional synchronization between Monaco's `ITextModel` and Yjs's `Y.Text`:
- **Mutex Protection**: Prevents recursive update loops using a custom re-entrant mutex lock pattern (`createMutex`).
- **Relative Position Mapping**: Tracks cursor and selection ranges across remote document mutations using `Y.createRelativePositionFromTypeIndex` and `Y.createAbsolutePositionFromRelativePosition`.
- **Dynamic CSS Injection**: Renders remote cursors and selection highlights with each collaborator's designated color, user initials, and floating name tooltip.
- **Resource Disposal**: Implements comprehensive cleanup (`destroy()`) to prevent memory leaks across tab switches and room departures.

### 2.2 Custom IDE Themes (`syncode-dark` & `syncode-light`)
Located in `apps/web/src/lib/monaco-theme.ts`:
- **`syncode-dark`**: Tailored to match SYNCODE's dark SaaS palette (`#111116` editor background, `#0D0D12` gutter, `#7657FF` brand purple selection and bracket match, `#ededed` high-contrast syntax tokens).
- **`syncode-light`**: High-clarity light theme with purple and emerald accents.

### 2.3 21 Supported Programming Languages
Located in `apps/web/src/lib/editor-languages.ts`:
1. TypeScript (`.ts`, `.mts`, `.cts`)
2. JavaScript (`.js`, `.mjs`, `.cjs`)
3. TSX (`.tsx`)
4. JSX (`.jsx`)
5. Python (`.py`)
6. Rust (`.rs`)
7. Go (`.go`)
8. Java (`.java`)
9. C++ (`.cpp`, `.hpp`, `.cc`, `.cxx`)
10. C (`.c`, `.h`)
11. C# (`.cs`)
12. PHP (`.php`)
13. JSON (`.json`)
14. HTML (`.html`, `.htm`)
15. CSS (`.css`)
16. SCSS (`.scss`)
17. SQL (`.sql`)
18. Markdown (`.md`, `.markdown`)
19. YAML (`.yaml`, `.yml`)
20. XML (`.xml`, `.svg`)
21. Shell (`.sh`, `.bash`, `.zsh`)

### 2.4 Multi-Tab Buffer Management (`EditorTabBar`)
Located in `apps/web/src/components/editor/editor-tab-bar.tsx`:
- File tabs with active highlights and close triggers.
- Tab addition dialog (`+`) with automatic language detection from filename extension.
- Syntax language selector dropdown covering all 21 languages.
- Word wrap toggle (`Alt+Z`).
- Format document action trigger (`Shift+Alt+F`).
- Settings dialog launcher.

### 2.5 Live Collaborator Roster (`CollaboratorRoster`)
Located in `apps/web/src/components/editor/collaborator-roster.tsx`:
- Collapsible side-pane showing real-time presence.
- Role badges (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`).
- Live cursor coordinates (`Ln X, Col Y`) for active collaborators.
- Designated user color ring and avatar initials.

### 2.6 Editor Preferences & Storage (`EditorSettingsDialog`)
Located in `apps/web/src/components/editor/editor-settings-dialog.tsx` and `apps/web/src/lib/editor-settings.ts`:
- Configurable font size (12–20px).
- Tab indentation size (2 or 4 spaces).
- Word wrap toggle (on/off).
- Minimap toggle (show/hide).
- Line numbers toggle (on/off).
- Theme selection (`syncode-dark`, `syncode-light`, `vs-dark`, `vs`).
- Monospace font family configuration.
- Bracket pair colorization.
- Persistent local storage caching (`syncode_editor_settings_v1`).

---

## 3. Security & Permission Enforcement

1. **Client-Side Enforcement**:
   - If the user's role is `VIEWER`, `isReadOnly: true` is set on the Monaco Editor.
   - Monaco disables keyboard inputs, cuts, pastes, and drag-and-drop mutations.
   - A warning banner alerts the user: *"View-Only Room Access: You are signed in as a Viewer. You can observe live collaborative code edits, but editing is disabled."*
2. **Server-Side Enforcement**:
   - The collaboration backend validates room membership permissions.
   - Any unauthorized Yjs update messages emitted by a viewer are rejected with `READ_ONLY_VIOLATION` (`CollaborationErrorCode.READ_ONLY_VIOLATION`).

---

## 4. Verification & Automated Test Coverage

The editor implementation includes automated unit and integration tests under `apps/web/src/__tests__/`:
- `editor-languages.test.ts`: Verifies detection of all 21 languages, extension mapping, and fallback resolution.
- `editor-settings.test.ts`: Tests settings persistence, defaults, and corrupted storage tolerance.
- `monaco-binding.test.ts`: Tests mutex recursion protection, initial Y.Text hydration, and remote mutation propagation into Monaco edit operations.
- `collaboration-simulation.test.ts`: Multi-client synchronization test simulating concurrent edits, awareness cursor propagation, and viewer read-only policy enforcement.
- `collaboration-client.test.ts`: Validates WebSocket client lifecycle, presence management, and text buffer operations.

