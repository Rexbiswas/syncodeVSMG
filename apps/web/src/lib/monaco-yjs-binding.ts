import * as Y from 'yjs';
import type * as monacoType from 'monaco-editor';
import type { Awareness } from 'y-protocols/awareness';

export function createMutex() {
  let isLocked = false;
  return (cb: () => void) => {
    if (!isLocked) {
      isLocked = true;
      try {
        cb();
      } finally {
        isLocked = false;
      }
    }
  };
}

export class RelativeSelection {
  constructor(
    public readonly start: Y.RelativePosition,
    public readonly end: Y.RelativePosition,
    public readonly direction: number,
  ) {}
}

export const createRelativeSelection = (
  editor: monacoType.editor.IStandaloneCodeEditor,
  monacoModel: monacoType.editor.ITextModel,
  type: Y.Text,
): RelativeSelection | null => {
  const sel = editor.getSelection();
  if (sel !== null) {
    const startPos = sel.getStartPosition();
    const endPos = sel.getEndPosition();
    const start = Y.createRelativePositionFromTypeIndex(type, monacoModel.getOffsetAt(startPos));
    const end = Y.createRelativePositionFromTypeIndex(type, monacoModel.getOffsetAt(endPos));
    return new RelativeSelection(start, end, sel.getDirection());
  }
  return null;
};

export const createMonacoSelectionFromRelativeSelection = (
  monaco: typeof monacoType,
  editor: monacoType.editor.IStandaloneCodeEditor,
  type: Y.Text,
  relSel: RelativeSelection,
  doc: Y.Doc,
): monacoType.Selection | null => {
  const start = Y.createAbsolutePositionFromRelativePosition(relSel.start, doc);
  const end = Y.createAbsolutePositionFromRelativePosition(relSel.end, doc);
  if (start !== null && end !== null && start.type === type && end.type === type) {
    const model = editor.getModel();
    if (!model) return null;
    const startPos = model.getPositionAt(start.index);
    const endPos = model.getPositionAt(end.index);
    return monaco.Selection.createWithDirection(
      startPos.lineNumber,
      startPos.column,
      endPos.lineNumber,
      endPos.column,
      relSel.direction,
    );
  }
  return null;
};

export interface RemoteAwarenessUser {
  id?: string;
  username?: string;
  displayName?: string;
  color?: string;
  role?: string;
}

export class MonacoYjsBinding {
  public readonly doc: Y.Doc;
  public readonly ytext: Y.Text;
  public readonly monacoModel: monacoType.editor.ITextModel;
  public readonly editors: Set<monacoType.editor.IStandaloneCodeEditor>;
  public readonly awareness: Awareness | null;
  public readonly monaco: typeof monacoType;

  private readonly mux = createMutex();
  private _savedSelections = new Map<monacoType.editor.IStandaloneCodeEditor, RelativeSelection>();
  private _decorations = new Map<monacoType.editor.IStandaloneCodeEditor, string[]>();
  private _disposables: monacoType.IDisposable[] = [];
  private _styleElement: HTMLStyleElement | null = null;
  private _isDestroyed = false;

  private readonly _beforeTransaction: () => void;
  private readonly _ytextObserver: (event: Y.YTextEvent) => void;
  private readonly _rerenderDecorations: () => void;

  constructor(
    ytext: Y.Text,
    monacoModel: monacoType.editor.ITextModel,
    editors: Set<monacoType.editor.IStandaloneCodeEditor> = new Set(),
    awareness: Awareness | null = null,
    monacoInstance: typeof monacoType,
  ) {
    const doc = ytext.doc;
    if (!doc) {
      throw new Error('Y.Text instance must be attached to a Y.Doc');
    }
    this.doc = doc;
    this.ytext = ytext;
    this.monacoModel = monacoModel;
    this.editors = editors;
    this.awareness = awareness;
    this.monaco = monacoInstance;

    this.initCursorStyles();

    this._beforeTransaction = () => {
      this.mux(() => {
        this._savedSelections = new Map();
        this.editors.forEach((editor) => {
          if (editor.getModel() === this.monacoModel) {
            const rsel = createRelativeSelection(editor, this.monacoModel, this.ytext);
            if (rsel !== null) {
              this._savedSelections.set(editor, rsel);
            }
          }
        });
      });
    };
    this.doc.on('beforeAllTransactions', this._beforeTransaction);

    this._rerenderDecorations = () => {
      if (this._isDestroyed) return;
      this.updateCursorStyles();

      this.editors.forEach((editor) => {
        if (this.awareness && editor.getModel() === this.monacoModel) {
          const currentDecorations = this._decorations.get(editor) || [];
          const newDecorations: monacoType.editor.IModelDeltaDecoration[] = [];

          this.awareness.getStates().forEach((state, clientID) => {
            if (
              clientID !== this.doc.clientID &&
              state.selection != null &&
              state.selection.anchor != null &&
              state.selection.head != null
            ) {
              const anchorAbs = Y.createAbsolutePositionFromRelativePosition(state.selection.anchor, this.doc);
              const headAbs = Y.createAbsolutePositionFromRelativePosition(state.selection.head, this.doc);

              if (anchorAbs !== null && headAbs !== null && anchorAbs.type === this.ytext && headAbs.type === this.ytext) {
                let startPos: monacoType.Position;
                let endPos: monacoType.Position;
                let afterContentClassName: string | undefined;
                let beforeContentClassName: string | undefined;

                if (anchorAbs.index <= headAbs.index) {
                  startPos = this.monacoModel.getPositionAt(anchorAbs.index);
                  endPos = this.monacoModel.getPositionAt(headAbs.index);
                  afterContentClassName = `yRemoteSelectionHead yRemoteSelectionHead-${clientID}`;
                } else {
                  startPos = this.monacoModel.getPositionAt(headAbs.index);
                  endPos = this.monacoModel.getPositionAt(anchorAbs.index);
                  beforeContentClassName = `yRemoteSelectionHead yRemoteSelectionHead-${clientID}`;
                }

                newDecorations.push({
                  range: new this.monaco.Range(
                    startPos.lineNumber,
                    startPos.column,
                    endPos.lineNumber,
                    endPos.column,
                  ),
                  options: {
                    className: `yRemoteSelection yRemoteSelection-${clientID}`,
                    afterContentClassName,
                    beforeContentClassName,
                  },
                });
              }
            }
          });

          const applied = editor.deltaDecorations(currentDecorations, newDecorations);
          this._decorations.set(editor, applied);
        } else {
          const current = this._decorations.get(editor);
          if (current && current.length > 0) {
            editor.deltaDecorations(current, []);
          }
          this._decorations.delete(editor);
        }
      });
    };

    this._ytextObserver = (event: Y.YTextEvent) => {
      this.mux(() => {
        let index = 0;
        event.delta.forEach((op) => {
          if (op.retain !== undefined) {
            index += op.retain;
          } else if (op.insert !== undefined) {
            const pos = this.monacoModel.getPositionAt(index);
            const range = new this.monaco.Selection(pos.lineNumber, pos.column, pos.lineNumber, pos.column);
            const insert = typeof op.insert === 'string' ? op.insert : '';
            this.monacoModel.applyEdits([{ range, text: insert }]);
            index += insert.length;
          } else if (op.delete !== undefined) {
            const pos = this.monacoModel.getPositionAt(index);
            const endPos = this.monacoModel.getPositionAt(index + op.delete);
            const range = new this.monaco.Selection(pos.lineNumber, pos.column, endPos.lineNumber, endPos.column);
            this.monacoModel.applyEdits([{ range, text: '' }]);
          }
        });

        this._savedSelections.forEach((rsel, editor) => {
          const sel = createMonacoSelectionFromRelativeSelection(this.monaco, editor, this.ytext, rsel, this.doc);
          if (sel !== null) {
            editor.setSelection(sel);
          }
        });
      });
      this._rerenderDecorations();
    };

    this.ytext.observe(this._ytextObserver);

    // Initial content synchronization
    const initialYTextValue = this.ytext.toString();
    if (this.monacoModel.getValue() !== initialYTextValue) {
      this.monacoModel.setValue(initialYTextValue);
    }

    // Capture local Monaco edits and propagate to Y.Text
    const contentSub = this.monacoModel.onDidChangeContent((event) => {
      this.mux(() => {
        this.doc.transact(() => {
          const changes = [...event.changes].sort((a, b) => b.rangeOffset - a.rangeOffset);
          for (const change of changes) {
            this.ytext.delete(change.rangeOffset, change.rangeLength);
            this.ytext.insert(change.rangeOffset, change.text);
          }
        }, this);
      });
    });
    this._disposables.push(contentSub);

    const disposeSub = this.monacoModel.onWillDispose(() => {
      this.destroy();
    });
    this._disposables.push(disposeSub);

    if (this.awareness) {
      this.editors.forEach((editor) => {
        const selSub = editor.onDidChangeCursorSelection(() => {
          if (editor.getModel() === this.monacoModel && this.awareness) {
            const sel = editor.getSelection();
            if (sel === null) return;

            let anchor = this.monacoModel.getOffsetAt(sel.getStartPosition());
            let head = this.monacoModel.getOffsetAt(sel.getEndPosition());
            if (sel.getDirection() === this.monaco.SelectionDirection.RTL) {
              const tmp = anchor;
              anchor = head;
              head = tmp;
            }

            this.awareness.setLocalStateField('selection', {
              anchor: Y.createRelativePositionFromTypeIndex(this.ytext, anchor),
              head: Y.createRelativePositionFromTypeIndex(this.ytext, head),
            });

            this.awareness.setLocalStateField('cursor', {
              line: sel.positionLineNumber,
              column: sel.positionColumn,
            });
          }
        });
        this._disposables.push(selSub);
      });

      this.awareness.on('change', this._rerenderDecorations);
    }
  }

  private initCursorStyles(): void {
    if (typeof document === 'undefined') return;
    let style = document.getElementById('syncode-cursor-styles') as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = 'syncode-cursor-styles';
      document.head.appendChild(style);
    }
    this._styleElement = style;
    this.updateCursorStyles();
  }

  private updateCursorStyles(): void {
    if (!this._styleElement || !this.awareness) return;

    let css = `
      .yRemoteSelection {
        background-color: rgba(118, 87, 255, 0.22);
      }
      .yRemoteSelectionHead {
        position: absolute;
        box-sizing: border-box;
        height: 100%;
        border-left: 2px solid #7657ff;
      }
      .yRemoteSelectionHead::after {
        position: absolute;
        top: -1.4em;
        left: -2px;
        font-size: 10px;
        font-family: inherit;
        font-weight: 600;
        padding: 1px 5px;
        border-radius: 4px;
        color: #ffffff;
        white-space: nowrap;
        pointer-events: none;
        z-index: 50;
        box-shadow: 0 2px 4px rgba(0,0,0,0.4);
      }
    `;

    this.awareness.getStates().forEach((state, clientID) => {
      if (clientID === this.doc.clientID) return;
      const user = (state.user || {}) as RemoteAwarenessUser;
      const color = user.color || '#7657ff';
      const name = (user.displayName || user.username || `User ${clientID}`).replace(/"/g, '\\"');

      css += `
        .yRemoteSelection-${clientID} {
          background-color: ${color}33 !important;
        }
        .yRemoteSelectionHead-${clientID} {
          border-left: 2px solid ${color} !important;
        }
        .yRemoteSelectionHead-${clientID}::after {
          content: "${name}";
          background-color: ${color} !important;
        }
      `;
    });

    this._styleElement.textContent = css;
  }

  public destroy(): void {
    if (this._isDestroyed) return;
    this._isDestroyed = true;

    for (const d of this._disposables) {
      d.dispose();
    }
    this._disposables = [];

    this.ytext.unobserve(this._ytextObserver);
    this.doc.off('beforeAllTransactions', this._beforeTransaction);

    if (this.awareness) {
      this.awareness.off('change', this._rerenderDecorations);
    }

    this.editors.forEach((editor) => {
      const current = this._decorations.get(editor);
      if (current && current.length > 0) {
        editor.deltaDecorations(current, []);
      }
    });
    this._decorations.clear();

    if (this._styleElement && this._styleElement.parentNode) {
      this._styleElement.parentNode.removeChild(this._styleElement);
      this._styleElement = null;
    }
  }
}

