import { useCallback, useEffect, useRef } from 'react';
import { useNodesInitialized, useReactFlow, useStore, type Viewport } from 'reactflow';
import { useCanvasStore } from '../../../store/useCanvasStore';
import { useQuizDataStore } from '../../../store/useQuizDataStore';
import { FIT_VIEW_OPTIONS, ZOOM } from '../constants';

const DEFAULT_VIEWPORT = { x: 0, y: 0, zoom: ZOOM.DEFAULT };

/** Keep the camera across the draft -> saved route remount, without refitting edits. */
export function useEditorViewport() {
  const defaultViewport = useRef(useCanvasStore.getState().viewport ?? DEFAULT_VIEWPORT).current;
  const needsInitialFit = useCanvasStore((s) => s.viewport === null);
  const rememberViewport = useCanvasStore((s) => s.rememberViewport);
  const editorKey = useQuizDataStore((s) => s.editorKey);
  const nodesInitialized = useNodesInitialized();
  const canvasReady = useStore((s) => Boolean(s.d3Zoom && s.width > 0 && s.height > 0));
  const { fitView, getViewport } = useReactFlow();

  useEffect(() => {
    if (!needsInitialFit || !nodesInitialized || !canvasReady) return;
    // React Flow must know both node sizes and canvas bounds. Run once for a
    // freshly loaded document; adding/selecting nodes and resizing do not refit.
    if (fitView({ ...FIT_VIEW_OPTIONS, duration: 0 })) {
      rememberViewport(getViewport());
    }
  }, [needsInitialFit, nodesInitialized, canvasReady, editorKey, fitView, getViewport, rememberViewport]);

  const onMoveEnd = useCallback((_: unknown, viewport: Viewport) => {
    if (useQuizDataStore.getState().editorKey === editorKey) rememberViewport(viewport);
  }, [editorKey, rememberViewport]);

  return { defaultViewport, onMoveEnd };
}
