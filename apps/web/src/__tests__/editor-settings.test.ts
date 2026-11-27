import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DEFAULT_EDITOR_SETTINGS,
  loadEditorSettings,
  saveEditorSettings,
} from '../lib/editor-settings';

describe('Editor Settings Engine Tests', () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        for (const k of Object.keys(store)) delete store[k];
      },
    });
  });

  it('loads default editor settings when local storage is empty', () => {
    const settings = loadEditorSettings();
    expect(settings.fontSize).toBe(14);
    expect(settings.tabSize).toBe(2);
    expect(settings.wordWrap).toBe('on');
    expect(settings.minimap).toBe(true);
    expect(settings.lineNumbers).toBe('on');
    expect(settings.theme).toBe('syncode-dark');
  });

  it('persists and retrieves updated settings', () => {
    saveEditorSettings({
      fontSize: 18,
      tabSize: 4,
      wordWrap: 'off',
      minimap: false,
    });

    const loaded = loadEditorSettings();
    expect(loaded.fontSize).toBe(18);
    expect(loaded.tabSize).toBe(4);
    expect(loaded.wordWrap).toBe('off');
    expect(loaded.minimap).toBe(false);
    expect(loaded.theme).toBe('syncode-dark'); // preserved default
  });

  it('handles corrupt localStorage gracefully', () => {
    localStorage.setItem('syncode_editor_settings_v1', 'invalid-json{{{');
    const loaded = loadEditorSettings();
    expect(loaded).toEqual(DEFAULT_EDITOR_SETTINGS);
  });
});
