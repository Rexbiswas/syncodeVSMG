import { describe, it, expect } from 'vitest';
import {
  SUPPORTED_LANGUAGES,
  getLanguageFromFilename,
  getLanguageById,
  getLanguageLabel,
} from '../lib/editor-languages';

describe('Editor Languages Registry Tests', () => {
  it('registers all 21 required languages', () => {
    expect(SUPPORTED_LANGUAGES.length).toBe(21);

    const expectedLanguageIds = [
      'typescript',
      'javascript',
      'tsx',
      'jsx',
      'python',
      'rust',
      'go',
      'java',
      'cpp',
      'c',
      'csharp',
      'php',
      'json',
      'html',
      'css',
      'scss',
      'sql',
      'markdown',
      'yaml',
      'xml',
      'shell',
    ];

    for (const id of expectedLanguageIds) {
      const found = SUPPORTED_LANGUAGES.find((lang) => lang.id === id);
      expect(found).toBeDefined();
      expect(found?.monacoId).toBeTruthy();
      expect(found?.extensions.length).toBeGreaterThan(0);
    }
  });

  it('detects language from file extensions accurately', () => {
    expect(getLanguageFromFilename('main.ts').id).toBe('typescript');
    expect(getLanguageFromFilename('index.js').id).toBe('javascript');
    expect(getLanguageFromFilename('App.tsx').id).toBe('tsx');
    expect(getLanguageFromFilename('Button.jsx').id).toBe('jsx');
    expect(getLanguageFromFilename('script.py').id).toBe('python');
    expect(getLanguageFromFilename('engine.rs').id).toBe('rust');
    expect(getLanguageFromFilename('service.go').id).toBe('go');
    expect(getLanguageFromFilename('Main.java').id).toBe('java');
    expect(getLanguageFromFilename('core.cpp').id).toBe('cpp');
    expect(getLanguageFromFilename('program.c').id).toBe('c');
    expect(getLanguageFromFilename('Program.cs').id).toBe('csharp');
    expect(getLanguageFromFilename('index.php').id).toBe('php');
    expect(getLanguageFromFilename('data.json').id).toBe('json');
    expect(getLanguageFromFilename('index.html').id).toBe('html');
    expect(getLanguageFromFilename('style.css').id).toBe('css');
    expect(getLanguageFromFilename('theme.scss').id).toBe('scss');
    expect(getLanguageFromFilename('queries.sql').id).toBe('sql');
    expect(getLanguageFromFilename('README.md').id).toBe('markdown');
    expect(getLanguageFromFilename('docker-compose.yml').id).toBe('yaml');
    expect(getLanguageFromFilename('config.xml').id).toBe('xml');
    expect(getLanguageFromFilename('deploy.sh').id).toBe('shell');
  });

  it('falls back gracefully to TypeScript for unknown extensions', () => {
    const unknown = getLanguageFromFilename('data.unknownext');
    expect(unknown.id).toBe('typescript');
  });

  it('finds language by ID or returns fallback', () => {
    expect(getLanguageById('python').id).toBe('python');
    expect(getLanguageById('rust').id).toBe('rust');
    expect(getLanguageById('nonexistent').id).toBe('typescript');
  });

  it('formats language label correctly', () => {
    expect(getLanguageLabel('typescript')).toBe('TypeScript');
    expect(getLanguageLabel('python')).toBe('Python');
    expect(getLanguageLabel('rust')).toBe('Rust');
  });
});

