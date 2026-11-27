'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import Editor, { type OnMount, type Monaco } from '@monaco-editor/react';
import type * as monacoType from 'monaco-editor';
import { registerMonacoThemes, SYNCODE_DARK_THEME_NAME } from '@/lib/monaco-theme';
import { MonacoYjsBinding } from '@/lib/monaco-yjs-binding';
import type { CollaborationClient } from '@/lib/collaboration-client';
import type { EditorSettings } from '@/lib/editor-settings';
import { getLanguageById } from '@/lib/editor-languages';
import { Loader2 } from 'lucide-react';

export interface MonacoCodeEditorProps {
  collaborationClient: CollaborationClient | null;
  language: string;
  settings: EditorSettings;
  isReadOnly?: boolean;
  onCursorChange?: (cursor: { line: number; column: number }) => void;
  editorRef?: React.MutableRefObject<monacoType.editor.IStandaloneCodeEditor | null>;
  initialValue?: string;
  onContentChange?: (value: string) => void;
}

export function MonacoCodeEditor({
  collaborationClient,
  language,
  settings,
  isReadOnly = false,
  onCursorChange,
  editorRef,
  initialValue = '',
  onContentChange,
}: MonacoCodeEditorProps) {
  const localEditorRef = useRef<monacoType.editor.IStandaloneCodeEditor | null>(null);
  const monacoInstanceRef = useRef<Monaco | null>(null);
  const bindingRef = useRef<MonacoYjsBinding | null>(null);

  const langInfo = getLanguageById(language);

  // Initialize and attach Monaco-Yjs Binding
  const handleEditorMount: OnMount = useCallback(
    (editor, monaco) => {
      localEditorRef.current = editor;
      monacoInstanceRef.current = monaco;
      if (editorRef) {
        editorRef.current = editor;
      }

      // 1. Register custom SYNCODE dark and light themes
      registerMonacoThemes(monaco);
      monaco.editor.setTheme(settings.theme || SYNCODE_DARK_THEME_NAME);

      // 2. Track cursor position
      editor.onDidChangeCursorPosition((e) => {
        onCursorChange?.({
          line: e.position.lineNumber,
          column: e.position.column,
        });
      });

      // 3. Bind to Yjs Real-Time CRDT Document if collaboration client exists
      if (collaborationClient) {
        const model = editor.getModel();
        if (model) {
          if (bindingRef.current) {
            bindingRef.current.destroy();
          }

          bindingRef.current = new MonacoYjsBinding(
            collaborationClient.text,
            model,
            new Set([editor]),
            collaborationClient.awareness,
            monaco,
          );
        }
      }

      // 4. Focus editor if not read-only
      if (!isReadOnly) {
        editor.focus();
      }
    },
    [collaborationClient, isReadOnly, onCursorChange, editorRef, settings.theme],
  );

  // Synchronize theme changes
  useEffect(() => {
    if (monacoInstanceRef.current) {
      monacoInstanceRef.current.editor.setTheme(settings.theme || SYNCODE_DARK_THEME_NAME);
    }
  }, [settings.theme]);

  // Synchronize language model mode
  useEffect(() => {
    if (localEditorRef.current && monacoInstanceRef.current) {
      const model = localEditorRef.current.getModel();
      if (model) {
        monacoInstanceRef.current.editor.setModelLanguage(model, langInfo.monacoId);
      }
    }
  }, [langInfo.monacoId]);

  // Update read-only setting
  useEffect(() => {
    if (localEditorRef.current) {
      localEditorRef.current.updateOptions({
        readOnly: isReadOnly,
      });
    }
  }, [isReadOnly]);

  // Cleanup binding on unmount
  useEffect(() => {
    return () => {
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
      if (editorRef) {
        editorRef.current = null;
      }
    };
  }, [editorRef]);

  // If collaboration client changes (e.g. reconnect or new document)
  useEffect(() => {
    if (localEditorRef.current && monacoInstanceRef.current && collaborationClient) {
      const model = localEditorRef.current.getModel();
      if (model) {
        if (bindingRef.current) {
          bindingRef.current.destroy();
        }
        bindingRef.current = new MonacoYjsBinding(
          collaborationClient.text,
          model,
          new Set([localEditorRef.current]),
          collaborationClient.awareness,
          monacoInstanceRef.current,
        );
      }
    }
  }, [collaborationClient]);

  return (
    <div className="relative w-full h-full min-h-[500px] flex-1 bg-[#111116] overflow-hidden">
      <Editor
        height="100%"
        width="100%"
        language={langInfo.monacoId}
        value={collaborationClient ? undefined : initialValue}
        defaultValue={collaborationClient ? undefined : initialValue}
        onChange={(value) => {
          if (!collaborationClient && onContentChange && value !== undefined) {
            onContentChange(value);
          }
        }}
        onMount={handleEditorMount}
        theme={settings.theme || SYNCODE_DARK_THEME_NAME}
        options={{
          readOnly: isReadOnly,
          fontSize: settings.fontSize,
          tabSize: settings.tabSize,
          wordWrap: settings.wordWrap,
          minimap: {
            enabled: settings.minimap,
            side: 'right',
            showSlider: 'always',
          },
          lineNumbers: settings.lineNumbers,
          fontFamily: settings.fontFamily,
          bracketPairColorization: {
            enabled: settings.bracketPairColorization,
          },
          cursorSmoothCaretAnimation: settings.cursorSmoothCaretAnimation,
          smoothScrolling: settings.smoothScrolling,
          renderWhitespace: settings.renderWhitespace,
          automaticLayout: true,
          scrollBeyondLastLine: false,
          padding: { top: 12, bottom: 12 },
          lineDecorationsWidth: 10,
          cursorBlinking: 'smooth',
          cursorStyle: 'line',
          cursorWidth: 2,
          roundedSelection: true,
          contextmenu: true,
          scrollbar: {
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
            vertical: 'visible',
            horizontal: 'visible',
            useShadows: false,
          },
        }}
        loading={
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-[#111116] text-zinc-400 gap-3">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            <span className="text-xs font-mono tracking-wider">INITIALIZING MONACO EDITOR...</span>
          </div>
        }
      />
    </div>
  );
}

