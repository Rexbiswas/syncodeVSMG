export interface SupportedLanguage {
  id: string;
  label: string;
  monacoId: string;
  extensions: string[];
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { id: 'typescript', label: 'TypeScript', monacoId: 'typescript', extensions: ['.ts', '.mts', '.cts'] },
  { id: 'javascript', label: 'JavaScript', monacoId: 'javascript', extensions: ['.js', '.mjs', '.cjs'] },
  { id: 'tsx', label: 'TypeScript React (TSX)', monacoId: 'typescript', extensions: ['.tsx'] },
  { id: 'jsx', label: 'JavaScript React (JSX)', monacoId: 'javascript', extensions: ['.jsx'] },
  { id: 'python', label: 'Python', monacoId: 'python', extensions: ['.py'] },
  { id: 'rust', label: 'Rust', monacoId: 'rust', extensions: ['.rs'] },
  { id: 'go', label: 'Go', monacoId: 'go', extensions: ['.go'] },
  { id: 'java', label: 'Java', monacoId: 'java', extensions: ['.java'] },
  { id: 'cpp', label: 'C++', monacoId: 'cpp', extensions: ['.cpp', '.hpp', '.cc', '.cxx', '.hxx'] },
  { id: 'c', label: 'C', monacoId: 'c', extensions: ['.c', '.h'] },
  { id: 'csharp', label: 'C#', monacoId: 'csharp', extensions: ['.cs'] },
  { id: 'php', label: 'PHP', monacoId: 'php', extensions: ['.php'] },
  { id: 'json', label: 'JSON', monacoId: 'json', extensions: ['.json'] },
  { id: 'html', label: 'HTML', monacoId: 'html', extensions: ['.html', '.htm'] },
  { id: 'css', label: 'CSS', monacoId: 'css', extensions: ['.css'] },
  { id: 'scss', label: 'SCSS', monacoId: 'scss', extensions: ['.scss'] },
  { id: 'sql', label: 'SQL', monacoId: 'sql', extensions: ['.sql'] },
  { id: 'markdown', label: 'Markdown', monacoId: 'markdown', extensions: ['.md', '.markdown'] },
  { id: 'yaml', label: 'YAML', monacoId: 'yaml', extensions: ['.yaml', '.yml'] },
  { id: 'xml', label: 'XML', monacoId: 'xml', extensions: ['.xml', '.svg'] },
  { id: 'shell', label: 'Shell / Bash', monacoId: 'shell', extensions: ['.sh', '.bash', '.zsh'] },
];

export function getLanguageFromFilename(filename: string): SupportedLanguage {
  const lower = filename.toLowerCase();
  for (const lang of SUPPORTED_LANGUAGES) {
    for (const ext of lang.extensions) {
      if (lower.endsWith(ext)) {
        return lang;
      }
    }
  }
  return SUPPORTED_LANGUAGES[0]; // Default to TypeScript
}

export function getLanguageById(id: string): SupportedLanguage {
  const found = SUPPORTED_LANGUAGES.find((lang) => lang.id === id || lang.monacoId === id);
  return found || SUPPORTED_LANGUAGES[0];
}

export function getLanguageLabel(id: string): string {
  const lang = getLanguageById(id);
  return lang.label;
}

