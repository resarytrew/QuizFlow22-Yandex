// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

describe('visual editor interaction contract', () => {
  it('does not resize custom nodes when selection changes', () => {
    const files = [
      'components/customNodes/BaseNode.tsx',
      'components/customNodes/StartNode.tsx',
      'components/customNodes/MatchingNode.tsx',
      'components/customNodes/ConditionNode.tsx',
      'components/customNodes/TextInputNode.tsx',
      'components/customNodes/TimelineNode.tsx',
    ];

    for (const file of files) {
      const source = read(file);
      expect(source, file).not.toMatch(
        /(?:isSelected|selected)[\s\S]{0,100}(?:scale-105|scale-110|scale-102)/,
      );
    }
  });

  it('never animates React Flow node wrapper transforms', () => {
    const css = read('components/QuizEditor/styles/editor.css');

    expect(css).not.toMatch(
      /\.react-flow__node\s*\{[^}]*(?:transition|transform)/,
    );
  });

  it('does not couple ordinary selection or editor resize to viewport commands', () => {
    const editor = read('components/QuizEditor/index.tsx');
    const layoutHooks = read('components/QuizEditor/hooks/useCanvasLayout.ts');

    expect(editor).not.toContain('useCenterOnSelected');
    expect(editor).not.toContain('useCanvasResize');
    expect(editor).not.toMatch(/\bsetCenter\b/);
    expect(layoutHooks).not.toContain('ResizeObserver');
    expect(layoutHooks).not.toContain('useCenterOnSelected');
  });

  it('keeps viewport changes behind explicit navigation controls', () => {
    const editor = read('components/QuizEditor/index.tsx');
    const settings = read('components/SettingsPanel.tsx');

    expect(editor).not.toMatch(/\bsetViewport\b|\bzoomTo\b|\bsetCenter\b/);
    expect(settings).not.toMatch(/\bsetViewport\b|\bzoomTo\b|\bsetCenter\b|\bfitView\b/);
  });

  it('keeps selection ID-based and free of viewport side effects', () => {
    const store = read('store/useCanvasStore.ts');
    const shortcuts = read('components/QuizEditor/hooks/useKeyboardShortcuts.ts');
    const statusBar = read('components/QuizEditor/StatusBar.tsx');

    expect(store).toContain('selection: EditorSelection');
    expect(store).not.toMatch(/\bselectedNode\s*:\s*Node/);
    expect(store).not.toMatch(/\bsetCenter\b|\bfitView\b|\bsetViewport\b|\bzoomTo\b/);
    expect(shortcuts).not.toMatch(/\.filter\([^\n]*\.selected/);
    expect(statusBar).not.toMatch(/\.filter\([^\n]*\.selected/);
  });
});
