'use client';

import React, { useState } from 'react';
import {
  FileCode,
  Plus,
  X,
  WrapText,
  Settings,
  AlignLeft,
  ChevronDown,
  Check,
  Code2,
} from 'lucide-react';
import type { EditorTab } from '@/lib/editor-tabs';
import {
  SUPPORTED_LANGUAGES,
  getLanguageById,
} from '@/lib/editor-languages';

interface EditorTabBarProps {
  tabs: EditorTab[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onAddTab: (name: string, languageId: string) => void;
  currentLanguage: string;
  onLanguageChange: (languageId: string) => void;
  isWordWrap: boolean;
  onToggleWordWrap: () => void;
  onFormatDocument: () => void;
  onOpenSettings: () => void;
  isReadOnly?: boolean;
}

export function EditorTabBar({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onAddTab,
  currentLanguage,
  onLanguageChange,
  isWordWrap,
  onToggleWordWrap,
  onFormatDocument,
  onOpenSettings,
  isReadOnly = false,
}: EditorTabBarProps) {
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isNewTabModalOpen, setIsNewTabModalOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileLang, setNewFileLang] = useState('typescript');

  const activeLang = getLanguageById(currentLanguage);

  const handleCreateNewTab = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    onAddTab(newFileName.trim(), newFileLang);
    setNewFileName('');
    setIsNewTabModalOpen(false);
  };

  return (
    <div className="bg-[#111116] border-b border-zinc-800 flex items-center justify-between select-none relative z-20">
      {/* Left: Tab Items */}
      <div className="flex items-center overflow-x-auto custom-editor-scrollbar max-w-[65%] sm:max-w-[75%]">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`group flex items-center gap-2 px-3.5 py-2.5 text-xs font-mono border-r border-zinc-800/80 cursor-pointer transition-all border-t-2 relative ${
                isActive
                  ? 'bg-[#0d0d12] text-zinc-100 border-t-purple-500 font-medium'
                  : 'bg-[#15151c]/60 text-zinc-400 hover:text-zinc-200 hover:bg-[#15151c] border-t-transparent'
              }`}
            >
              <FileCode
                className={`w-3.5 h-3.5 ${
                  isActive ? 'text-purple-400' : 'text-zinc-500 group-hover:text-zinc-400'
                }`}
              />
              <span className="truncate max-w-[120px]">{tab.name}</span>

              {tabs.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all ml-1"
                  title="Close Tab"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}

        {/* Add Tab Trigger */}
        {!isReadOnly && (
          <button
            type="button"
            onClick={() => setIsNewTabModalOpen(true)}
            className="px-2.5 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors"
            title="Create New Buffer / File"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Right: Actions & Language Selector */}
      <div className="flex items-center gap-1 px-2.5 py-1.5 flex-shrink-0">
        {/* Language Selector Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700/80 hover:border-zinc-600 text-zinc-300 hover:text-white text-xs font-mono transition-colors"
            title="Change Syntax Language"
          >
            <Code2 className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">{activeLang.label}</span>
            <span className="sm:hidden">{activeLang.id}</span>
            <ChevronDown className="w-3 h-3 text-zinc-400 ml-0.5" />
          </button>

          {isLangMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setIsLangMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1.5 w-56 max-h-72 overflow-y-auto custom-editor-scrollbar bg-[#17171f] border border-zinc-700 rounded-xl shadow-2xl p-1 z-40">
                <div className="px-2.5 py-1.5 text-[10px] font-semibold text-zinc-400 tracking-wider uppercase border-b border-zinc-800">
                  Select Language ({SUPPORTED_LANGUAGES.length})
                </div>
                {SUPPORTED_LANGUAGES.map((lang) => {
                  const isSelected = lang.id === currentLanguage || lang.monacoId === currentLanguage;
                  return (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => {
                        onLanguageChange(lang.id);
                        setIsLangMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                        isSelected
                          ? 'bg-purple-600/20 text-purple-300 font-semibold'
                          : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                      }`}
                    >
                      <span>{lang.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-purple-400" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Word Wrap Toggle */}
        <button
          type="button"
          onClick={onToggleWordWrap}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono transition-colors ${
            isWordWrap
              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 font-medium'
              : 'bg-zinc-900 border border-zinc-700/80 text-zinc-400 hover:text-zinc-200'
          }`}
          title="Toggle Word Wrap (Alt+Z)"
        >
          <WrapText className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Wrap</span>
        </button>

        {/* Format Document */}
        {!isReadOnly && (
          <button
            type="button"
            onClick={onFormatDocument}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700/80 hover:border-zinc-600 text-zinc-400 hover:text-zinc-200 text-xs font-mono transition-colors"
            title="Format Document (Shift+Alt+F)"
          >
            <AlignLeft className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Format</span>
          </button>
        )}

        {/* Editor Settings Trigger */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-700/80 hover:border-zinc-600 text-zinc-400 hover:text-zinc-200 transition-colors"
          title="Editor Preferences"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* New File Modal */}
      {isNewTabModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#111116] border border-zinc-800 rounded-2xl p-5 shadow-2xl text-zinc-100 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-semibold">Create New Tab Buffer</h3>
              <button
                type="button"
                onClick={() => setIsNewTabModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewTab} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-300">File / Buffer Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. server.ts, style.css, query.sql"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  className="mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300">Language</label>
                <select
                  value={newFileLang}
                  onChange={(e) => setNewFileLang(e.target.value)}
                  className="mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.id} value={lang.id}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewTabModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-medium bg-purple-600 hover:bg-purple-500 text-white transition-colors"
                >
                  Create Buffer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
