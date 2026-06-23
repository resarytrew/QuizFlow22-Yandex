import React from 'react';
import ContextMenu from '../ContextMenu';
import EdgeContextMenu from '../EdgeContextMenu';
import QuickAddMenu from '../QuickAddMenu';
import { EdgeLabelEditor } from './EdgeLabelEditor';
import { ConnectionHint } from './ConnectionHint';
import { NodeMenuState, EdgeMenuState, EdgeEditState } from './hooks/useEditorMenus';
import { QuickAddPos } from './createNewNode';
import type { CustomNodeType } from '../../types';

interface EditorMenusProps {
  isConnecting: boolean;
  nodeMenu: NodeMenuState | null;
  edgeMenu: EdgeMenuState | null;
  quickAddMenu: QuickAddPos | null;
  editingEdge: EdgeEditState | null;
  onNodeMenuClose: () => void;
  onEdgeMenuClose: () => void;
  onQuickAddClose: () => void;
  onEdgeEditClose: () => void;
  onEdgeEditSubmit: (value: string) => void;
  onDeleteNode: (id: string) => void;
  onDeleteEdge: (id: string) => void;
  onEditFromMenu: (id: string) => void;
  onDuplicateFromMenu: (id: string) => void;
  onPreviewFromNode: (id: string) => void;
  onQuickAddSelect: (type: CustomNodeType) => void;
}

export const EditorMenus = React.memo<EditorMenusProps>(({
  isConnecting,
  nodeMenu,
  edgeMenu,
  quickAddMenu,
  editingEdge,
  onNodeMenuClose,
  onEdgeMenuClose,
  onQuickAddClose,
  onEdgeEditClose,
  onEdgeEditSubmit,
  onDeleteNode,
  onDeleteEdge,
  onEditFromMenu,
  onDuplicateFromMenu,
  onPreviewFromNode,
  onQuickAddSelect,
}) => (
  <>
    <ConnectionHint visible={isConnecting} />

    {nodeMenu && (
      <ContextMenu
        id={nodeMenu.id}
        top={nodeMenu.top}
        left={nodeMenu.left}
        onClose={onNodeMenuClose}
        onEdit={onEditFromMenu}
        onDuplicate={onDuplicateFromMenu}
        onPreview={onPreviewFromNode}
        onDelete={onDeleteNode}
      />
    )}

    {edgeMenu && (
      <EdgeContextMenu
        id={edgeMenu.id}
        top={edgeMenu.top}
        left={edgeMenu.left}
        onClose={onEdgeMenuClose}
        onDelete={onDeleteEdge}
      />
    )}

    {quickAddMenu && (
      <QuickAddMenu
        top={quickAddMenu.local.y}
        left={quickAddMenu.local.x}
        onClose={onQuickAddClose}
        onSelect={onQuickAddSelect}
      />
    )}

    {editingEdge && (
      <EdgeLabelEditor
        initialValue={editingEdge.label}
        onSubmit={onEdgeEditSubmit}
        onCancel={onEdgeEditClose}
      />
    )}
  </>
));

EditorMenus.displayName = 'EditorMenus';
