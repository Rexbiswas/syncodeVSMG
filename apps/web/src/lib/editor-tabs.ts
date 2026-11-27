export interface EditorTab {
  id: string;
  name: string;
  language: string;
  documentKey: string;
  isModified?: boolean;
}

export const DEFAULT_ROOM_TABS: EditorTab[] = [
  { id: 'tab-main-ts', name: 'main.ts', language: 'typescript', documentKey: 'main.ts' },
  { id: 'tab-types-ts', name: 'types.ts', language: 'typescript', documentKey: 'types.ts' },
  { id: 'tab-readme-md', name: 'README.md', language: 'markdown', documentKey: 'README.md' },
];

