import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { useCanvasStore } from '../../../store/useCanvasStore';
import { storeEvents } from '../../../store/storeEvents';

const flow = vi.hoisted(() => ({
  nodesInitialized: false,
  canvasReady: false,
  editorKey: 'document-1',
  fitView: vi.fn(),
  getViewport: vi.fn(),
}));
vi.mock('reactflow', async importOriginal => ({
  ...await importOriginal<typeof import('reactflow')>(),
  useNodesInitialized: () => flow.nodesInitialized,
  useStore: () => flow.canvasReady,
  useReactFlow: () => ({ fitView: flow.fitView, getViewport: flow.getViewport }),
}));
vi.mock('../../../store/useQuizDataStore', () => ({
  useQuizDataStore: Object.assign(
    (selector: (s: {editorKey:string}) => unknown) => selector({editorKey:flow.editorKey}),
    { getState: () => ({editorKey:flow.editorKey}) },
  ),
}));
import { useEditorViewport } from './useEditorViewport';

beforeEach(() => {
  useCanvasStore.getState().reset();
  flow.nodesInitialized = false;
  flow.canvasReady = false;
  flow.editorKey = 'document-1';
  flow.fitView.mockReset().mockReturnValue(true);
  flow.getViewport.mockReset().mockReturnValue({x:530,y:280,zoom:1});
});

it('centers after measurement and leaves later node edits and resize alone', () => {
  const {rerender} = renderHook(() => useEditorViewport());
  expect(flow.fitView).not.toHaveBeenCalled();
  flow.canvasReady = true;
  rerender();
  expect(flow.fitView).not.toHaveBeenCalled();
  flow.nodesInitialized = true;
  rerender();
  expect(flow.fitView).toHaveBeenCalledTimes(1);
  expect(useCanvasStore.getState().viewport).toEqual({x:530,y:280,zoom:1});
  flow.nodesInitialized = false;
  rerender();
  flow.nodesInitialized = true;
  rerender();
  flow.canvasReady = false;
  rerender();
  flow.canvasReady = true;
  rerender();
  expect(flow.fitView).toHaveBeenCalledTimes(1);
});

it('restores the user camera across a route remount instead of fitting again', () => {
  flow.nodesInitialized = flow.canvasReady = true;
  useCanvasStore.getState().rememberViewport({x:-100,y:50,zoom:0.75});
  const first = renderHook(() => useEditorViewport());
  expect(first.result.current.defaultViewport).toEqual({x:-100,y:50,zoom:0.75});
  act(() => first.result.current.onMoveEnd(null,{x:-420,y:120,zoom:0.5}));
  first.unmount();
  const next = renderHook(() => useEditorViewport());
  expect(next.result.current.defaultViewport).toEqual({x:-420,y:120,zoom:0.5});
  expect(flow.fitView).not.toHaveBeenCalled();
});

it('fits a newly loaded document and ignores move callbacks from the old document', () => {
  flow.nodesInitialized = flow.canvasReady = true;
  useCanvasStore.getState().rememberViewport({x:-100,y:50,zoom:0.75});
  const {result,rerender} = renderHook(() => useEditorViewport());
  const oldMoveEnd = result.current.onMoveEnd;
  act(() => {
    flow.editorKey = 'document-2';
    storeEvents.emit('QUIZ_LOADED',{nodes:[],edges:[]});
  });
  rerender();
  expect(flow.fitView).toHaveBeenCalledTimes(1);
  act(() => oldMoveEnd(null,{x:9000,y:9000,zoom:2}));
  expect(useCanvasStore.getState().viewport).toEqual({x:530,y:280,zoom:1});
});
