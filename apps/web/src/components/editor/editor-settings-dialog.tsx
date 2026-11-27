'use client';

import React from 'react';
import { X, Settings, RotateCcw } from 'lucide-react';
import {
  type EditorSettings,
  DEFAULT_EDITOR_SETTINGS,
  saveEditorSettings,
} from '@/lib/editor-settings';

interface EditorSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  settings: EditorSettings;
  onSettingsChange: (settings: EditorSettings) => void;
}

export function EditorSettingsDialog({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
}: EditorSettingsDialogProps) {
  if (!isOpen) return null;

  const updateSetting = <K extends keyof EditorSettings>(
    key: K,
    value: EditorSettings[K],
  ) => {
    const updated = saveEditorSettings({ [key]: value });
    onSettingsChange(updated);
  };

  const handleReset = () => {
    const reset = saveEditorSettings(DEFAULT_EDITOR_SETTINGS);
    onSettingsChange(reset);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-[#111116] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-zinc-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-settings-title"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-[#15151c]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Settings className="w-4 h-4" />
            </div>
            <h2 id="editor-settings-title" className="text-sm font-semibold tracking-wide">
              Editor Preferences
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-editor-scrollbar">
          {/* Theme */}
          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="setting-theme" className="text-xs font-medium text-zinc-200">Theme</label>
              <p className="text-[11px] text-zinc-500">Color scheme for the editor interface</p>
            </div>
            <select
              id="setting-theme"
              value={settings.theme}
              onChange={(e) => updateSetting('theme', e.target.value)}
              className="bg-zinc-900 border border-zinc-700 text-xs rounded-lg px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-purple-500"
            >
              <option value="syncode-dark">SYNCODE Dark (Default)</option>
              <option value="syncode-light">SYNCODE Light</option>
              <option value="vs-dark">Monaco Dark (VS Dark)</option>
              <option value="vs">Monaco Light (VS)</option>
            </select>
          </div>

          {/* Font Size */}
          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="setting-font-size" className="text-xs font-medium text-zinc-200">Font Size</label>
              <p className="text-[11px] text-zinc-500">Editor text size in pixels</p>
            </div>
            <select
              id="setting-font-size"
              value={settings.fontSize}
              onChange={(e) => updateSetting('fontSize', Number(e.target.value))}
              className="bg-zinc-900 border border-zinc-700 text-xs rounded-lg px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-purple-500"
            >
              {[12, 13, 14, 15, 16, 18, 20].map((size) => (
                <option key={size} value={size}>
                  {size}px
                </option>
              ))}
            </select>
          </div>

          {/* Tab Size */}
          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="setting-tab-size" className="text-xs font-medium text-zinc-200">Tab Size</label>
              <p className="text-[11px] text-zinc-500">Number of spaces per indentation level</p>
            </div>
            <select
              id="setting-tab-size"
              value={settings.tabSize}
              onChange={(e) => updateSetting('tabSize', Number(e.target.value))}
              className="bg-zinc-900 border border-zinc-700 text-xs rounded-lg px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-purple-500"
            >
              <option value={2}>2 spaces</option>
              <option value={4}>4 spaces</option>
            </select>
          </div>

          {/* Word Wrap */}
          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="setting-word-wrap" className="text-xs font-medium text-zinc-200">Word Wrap</label>
              <p className="text-[11px] text-zinc-500">Wrap long lines to fit editor viewport (Alt+Z)</p>
            </div>
            <button
              id="setting-word-wrap"
              onClick={() => updateSetting('wordWrap', settings.wordWrap === 'on' ? 'off' : 'on')}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.wordWrap === 'on' ? 'bg-purple-600' : 'bg-zinc-800'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  settings.wordWrap === 'on' ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Minimap */}
          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="setting-minimap" className="text-xs font-medium text-zinc-200">Minimap</label>
              <p className="text-[11px] text-zinc-500">Show high-level code outline preview</p>
            </div>
            <button
              id="setting-minimap"
              onClick={() => updateSetting('minimap', !settings.minimap)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.minimap ? 'bg-purple-600' : 'bg-zinc-800'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  settings.minimap ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Line Numbers */}
          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="setting-line-numbers" className="text-xs font-medium text-zinc-200">Line Numbers</label>
              <p className="text-[11px] text-zinc-500">Display gutter line numbering</p>
            </div>
            <button
              id="setting-line-numbers"
              onClick={() => updateSetting('lineNumbers', settings.lineNumbers === 'on' ? 'off' : 'on')}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.lineNumbers === 'on' ? 'bg-purple-600' : 'bg-zinc-800'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  settings.lineNumbers === 'on' ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Bracket Pair Colorization */}
          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="setting-bracket-pairs" className="text-xs font-medium text-zinc-200">Bracket Colorization</label>
              <p className="text-[11px] text-zinc-500">Highlight matching bracket pairs with distinct colors</p>
            </div>
            <button
              id="setting-bracket-pairs"
              onClick={() => updateSetting('bracketPairColorization', !settings.bracketPairColorization)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.bracketPairColorization ? 'bg-purple-600' : 'bg-zinc-800'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  settings.bracketPairColorization ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Font Family */}
          <div>
            <label htmlFor="setting-font-family" className="text-xs font-medium text-zinc-200">Font Family</label>
            <p className="text-[11px] text-zinc-500 mb-1.5">Monospace font family used in the editor</p>
            <input
              id="setting-font-family"
              type="text"
              value={settings.fontFamily}
              onChange={(e) => updateSetting('fontFamily', e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 text-xs rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-purple-500 font-mono"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 flex items-center justify-between bg-[#15151c]">
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors shadow-lg shadow-purple-600/20"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

