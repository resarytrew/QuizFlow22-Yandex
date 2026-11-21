import { useState, useCallback } from 'react';
import { QuickAddPos } from '../createNewNode';

export interface NodeMenuState {
  id: string;
  top: number;
  left: number;
}

export interface EdgeMenuState {
  id: string;
  top: number;
  left: number;
}


export function useEditorMenus() {
  const [nodeMenu, setNodeMenu] = useState<NodeMenuState | null>(null);
  const [edgeMenu, setEdgeMenu] = useState<EdgeMenuState | null>(null);
  const [quickAdd, setQuickAdd] = useState<QuickAddPos | null>(null);

  const closeAll = useCallback(() => {
    setNodeMenu(null);
    setEdgeMenu(null);
    setQuickAdd(null);
  }, []);

  return {
    nodeMenu,
    setNodeMenu,
    edgeMenu,
    setEdgeMenu,
    quickAdd,
    setQuickAdd,
    closeAll,
  };
}
