export interface EditorSettings {
  fontSize: number;
  tabSize: number;
  wordWrap: 'on' | 'off';
  minimap: boolean;
  lineNumbers: 'on' | 'off';
  theme: string;
  fontFamily: string;
  bracketPairColorization: boolean;
  cursorSmoothCaretAnimation: 'on' | 'off';
  smoothScrolling: boolean;
  renderWhitespace: 'none' | 'boundary' | 'selection' | 'all';
}

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  fontSize: 14,
  tabSize: 2,
  wordWrap: 'on',
  minimap: true,
  lineNumbers: 'on',
  theme: 'syncode-dark',
  fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, Monaco, Consolas, monospace",
  bracketPairColorization: true,
  cursorSmoothCaretAnimation: 'on',
  smoothScrolling: true,
  renderWhitespace: 'selection',
};

const SETTINGS_STORAGE_KEY = 'syncode_editor_settings_v1';

export function loadEditorSettings(): EditorSettings {
  if (typeof localStorage === 'undefined') {
    return { ...DEFAULT_EDITOR_SETTINGS };
  }

  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_EDITOR_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_EDITOR_SETTINGS,
      ...parsed,
    };
  } catch {
    return { ...DEFAULT_EDITOR_SETTINGS };
  }
}

export function saveEditorSettings(settings: Partial<EditorSettings>): EditorSettings {
  if (typeof localStorage === 'undefined') {
    return { ...DEFAULT_EDITOR_SETTINGS, ...settings };
  }

  try {
    const current = loadEditorSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return { ...DEFAULT_EDITOR_SETTINGS, ...settings };
  }
}
