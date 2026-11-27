import type * as monacoType from 'monaco-editor';

export const SYNCODE_DARK_THEME_NAME = 'syncode-dark';
export const SYNCODE_LIGHT_THEME_NAME = 'syncode-light';

export const syncodeDarkTheme: monacoType.editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: '', foreground: 'ededed', background: '111116' },
    { token: 'keyword', foreground: 'c084fc', fontStyle: 'bold' },
    { token: 'keyword.control', foreground: 'c084fc', fontStyle: 'bold' },
    { token: 'keyword.operator', foreground: 'a1a1aa' },
    { token: 'string', foreground: '34d399' },
    { token: 'string.escape', foreground: '6ee7b7' },
    { token: 'number', foreground: 'fbbf24' },
    { token: 'number.hex', foreground: 'fbbf24' },
    { token: 'comment', foreground: '71717a', fontStyle: 'italic' },
    { token: 'comment.doc', foreground: '848490', fontStyle: 'italic' },
    { token: 'type', foreground: '38bdf8' },
    { token: 'type.identifier', foreground: '38bdf8' },
    { token: 'class', foreground: '38bdf8', fontStyle: 'bold' },
    { token: 'function', foreground: '60a5fa' },
    { token: 'identifier', foreground: 'f4f4f5' },
    { token: 'variable', foreground: 'f4f4f5' },
    { token: 'variable.predefined', foreground: 'f87171' },
    { token: 'constant', foreground: 'f472b6' },
    { token: 'delimiter', foreground: 'a1a1aa' },
    { token: 'delimiter.bracket', foreground: 'e4e4e7' },
    { token: 'tag', foreground: 'c084fc' },
    { token: 'attribute.name', foreground: '38bdf8' },
    { token: 'attribute.value', foreground: '34d399' },
  ],
  colors: {
    'editor.background': '#111116',
    'editor.foreground': '#ededed',
    'editorLineNumber.foreground': '#52525b',
    'editorLineNumber.activeForeground': '#a78bfa',
    'editorCursor.foreground': '#a78bfa',
    'editor.selectionBackground': '#7657ff38',
    'editor.inactiveSelectionBackground': '#7657ff1a',
    'editor.selectionHighlightBackground': '#7657ff20',
    'editor.lineHighlightBackground': '#ffffff0a',
    'editor.lineHighlightBorder': '#00000000',
    'editorGutter.background': '#0d0d12',
    'editorGutter.modifiedBackground': '#38bdf8',
    'editorGutter.addedBackground': '#34d399',
    'editorGutter.deletedBackground': '#f87171',
    'editorIndentGuide.background1': '#27272a80',
    'editorIndentGuide.activeBackground1': '#7657ff80',
    'editorBracketMatch.background': '#7657ff26',
    'editorBracketMatch.border': '#a78bfa',
    'editorOverviewRuler.border': '#00000000',
    'editorWhitespace.foreground': '#27272a',
    'minimap.background': '#0d0d12',
    'minimapSlider.background': '#ffffff0d',
    'minimapSlider.hoverBackground': '#ffffff1a',
    'minimapSlider.activeBackground': '#7657ff33',
    'scrollbarSlider.background': '#ffffff14',
    'scrollbarSlider.hoverBackground': '#ffffff26',
    'scrollbarSlider.activeBackground': '#7657ff4d',
    'editorWidget.background': '#17171f',
    'editorWidget.border': '#27272a',
    'editorSuggestWidget.background': '#17171f',
    'editorSuggestWidget.border': '#27272a',
    'editorSuggestWidget.selectedBackground': '#7657ff33',
    'editorHoverWidget.background': '#17171f',
    'editorHoverWidget.border': '#27272a',
  },
};

export const syncodeLightTheme: monacoType.editor.IStandaloneThemeData = {
  base: 'vs',
  inherit: true,
  rules: [
    { token: '', foreground: '18181b', background: 'ffffff' },
    { token: 'keyword', foreground: '7c3aed', fontStyle: 'bold' },
    { token: 'string', foreground: '059669' },
    { token: 'number', foreground: 'd97706' },
    { token: 'comment', foreground: 'a1a1aa', fontStyle: 'italic' },
    { token: 'type', foreground: '0284c7' },
    { token: 'function', foreground: '2563eb' },
    { token: 'variable', foreground: '18181b' },
  ],
  colors: {
    'editor.background': '#ffffff',
    'editor.foreground': '#18181b',
    'editorLineNumber.foreground': '#a1a1aa',
    'editorLineNumber.activeForeground': '#7c3aed',
    'editorCursor.foreground': '#7c3aed',
    'editor.selectionBackground': '#7c3aed26',
    'editor.lineHighlightBackground': '#f4f4f580',
    'editorGutter.background': '#fafafa',
  },
};

export function registerMonacoThemes(monaco: typeof monacoType): void {
  monaco.editor.defineTheme(SYNCODE_DARK_THEME_NAME, syncodeDarkTheme);
  monaco.editor.defineTheme(SYNCODE_LIGHT_THEME_NAME, syncodeLightTheme);
}

