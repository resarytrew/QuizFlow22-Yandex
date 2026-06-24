import React, { useRef, useState, useCallback, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Panel,
  ConnectionLineType,
  useReactFlow,
  type Node,
  type NodeChange,
  type EdgeChange,
  type OnConnectStartParams,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { DS, ZOOM } from './constants';
import { edgeTypes } from './FlowEdge';
import { nodeTypes } from './nodeTypes';
import { LoadingScreen } from './LoadingScreen';
import { StatusBar } from './StatusBar';
import { EnhancedMinimap } from './EnhancedMinimap';
import { BottomControlBar } from './BottomControlBar';
import Breadcrumbs from '../Breadcrumbs';
import CanvasSearch from '../CanvasSearch';
import { createNewNode } from './createNewNode';
import { useEditorActions, useEditorData } from './hooks/useEditorStore';
import { useEditorMenus } from './hooks/useEditorMenus';
import { useCanvasLayout, useCanvasResize, useCenterOnSelected } from './hooks/useCanvasLayout';
import { useCanvasInteraction } from './hooks/useCanvasInteraction';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { EditorMenus } from './EditorOverlays';
import { LockBanner } from './LockBanner';

import './styles/editor.css';
import type { CustomNodeType } from '../../types';
import { usePreferencesStore } from '../../store/usePreferencesStore';
import { getCanvasBackgroundConfig } from './canvasPreferences';
import { useUIStore } from '../../store/useUIStore';
import { useEntitlementStore } from '../../store/useEntitlementStore';
import { useAppNavigation } from '../../src/router/useAppNavigation';
import { hasFeature } from '../Paywall';
import toast from 'react-hot-toast';

const DEFAULT_EDGE_OPTIONS = { type: 'default' as const };
const DEFAULT_VIEWPORT = { x: 0, y: 0, zoom: ZOOM.DEFAULT };
const SNAP_GRID: [number, number] = [16, 16];
const CONNECTION_LINE_STYLE = { strokeWidth: 2, stroke: DS.colors.edgeActive };

const QuizEditor: React.FC = () => {
  const { nodes, edges, boardSettings, isCanvasLocked, currentGroup, selectedNode, isCanvasLoading } = useEditorData();
  const actions = useEditorActions();
  const menus = useEditorMenus();

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [rfInstance, setRfInstance] = useState<any>(null);
  const [connectingFrom, setConnectingFrom] = useState<{ nodeId: string; handleId?: string | null } | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const showGrid = usePreferencesStore((s) => s.preferences.showGrid);
  const snapToGrid = usePreferencesStore((s) => s.preferences.snapToGrid);
  const reduceMotion = usePreferencesStore((s) => s.preferences.reduceMotion);
  const simplified = usePreferencesStore((s) => s.preferences.simplified);
  const setPreference = usePreferencesStore((s) => s.setPreference);
  const isAIAssistantPanelVisible = useUIStore((s) => s.isAIAssistantPanelVisible);
  const toggleAIAssistantPanel = useUIStore((s) => s.toggleAIAssistantPanel);
  const entitlement = useEntitlementStore((s) => s.entitlement);
  const nav = useAppNavigation();
  const lowPowerMode = reduceMotion || simplified;
  const isAIAssistantLocked = !hasFeature(entitlement.plan, entitlement.features, 'ai_assistant_advanced');

  const { screenToFlowPosition, getNode, fitView, setCenter } = useReactFlow();

  // React Flow warns when nodeTypes/edgeTypes change identity between
  // renders. The module-level exports are stable, but Vite's Fast Refresh
  // re-evaluates this module on edit, creating a fresh object identity
  // and triggering the false positive warning. Memoize the references
  // so React Flow never sees a "new" object.
  const stableNodeTypes = useMemo(() => nodeTypes, []);
  const stableEdgeTypes = useMemo(() => edgeTypes, []);

  const visibleNodes = useMemo(() => {
    return nodes.filter((n) => {
      const parentId = n.data?.parentId;
      return currentGroup ? parentId === currentGroup : !parentId;
    });
  }, [nodes, currentGroup]);

  const visibleNodeIds = useMemo(() => new Set<string>(visibleNodes.map((n) => n.id)), [visibleNodes]);

  const visibleEdges = useMemo(() => {
    return edges.filter((e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target));
  }, [edges, visibleNodeIds]);

  const flowStyle = useMemo(() => ({
    backgroundColor: boardSettings?.backgroundColor || DS.colors.canvasBg,
  }), [boardSettings?.backgroundColor]);

  const { handleLayout } = useCanvasLayout({
    fitView,
    nodes,
    visibleNodes,
    visibleEdges,
    visibleNodeIds,
    setNodes: actions.setNodes,
  });

  useCanvasResize({ fitView, wrapperRef: reactFlowWrapper });
  useCenterOnSelected({ getNode, setCenter, selectedNode });

  useKeyboardShortcuts({
    visibleNodes,
    visibleEdges,
    isCanvasLocked,
    deleteNode: actions.deleteNode,
    deleteEdge: actions.deleteEdge,
    undo: actions.undo,
    redo: actions.redo,
    addNode: actions.addNode,
  });

  const onEditEdgeLabel = useCallback((edgeId: string, currentLabel: string) => {
    menus.setEditingEdge({ id: edgeId, label: currentLabel });
  }, [menus.setEditingEdge]);

  const {
    onDrop,
    onDragOver,
    onPaneContextMenu,
    onNodeContextMenu,
    onEdgeContextMenu,
    onEdgeDoubleClick,
    handleQuickAdd,
    onNodeClick,
    onPaneClick,
    isValidConnection,
    handleConnectStart,
    handleConnectEnd,
    handleDuplicate,
    handleEditFromMenu,
    handlePreviewFromNode,
  } = useCanvasInteraction({
    reactFlowWrapper,
    isCanvasLocked,
    connectingFrom,
    quickAddMenu: menus.quickAdd,
    visibleNodes,
    visibleEdges,
    edges,
    setMenu: menus.setNodeMenu,
    setEdgeMenu: menus.setEdgeMenu,
    setQuickAddMenu: menus.setQuickAdd,
    setConnectingFrom,
    setIsConnecting,
    setSelectedNode: actions.setSelectedNode,
    addNode: actions.addNode,
    deleteNode: actions.deleteNode,
    deleteEdge: actions.deleteEdge,
    onEditEdgeLabel,
    onConnect: actions.onConnect,
    screenToFlowPosition,
    getNode,
    setPreviewMode: actions.setPreviewMode,
  });

  const onInit = useCallback((instance: any) => {
    setRfInstance(instance);
  }, []);

  const handleNodeDragStart = useCallback((_: React.MouseEvent, node: Node) => {
    setDraggedNodeId(node.id);
  }, []);

  const handleNodeDragStop = useCallback(() => {
    setDraggedNodeId(null);
  }, []);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (isCanvasLocked) return;
      const filtered = changes.filter((change: any) => {
        if (draggedNodeId && change.type === 'position' && change.id && change.id !== draggedNodeId) return false;
        if (change.id) return visibleNodeIds.has(change.id);
        return true;
      });
      if (filtered.length > 0) actions.onNodesChange(filtered);
    },
    [actions.onNodesChange, visibleNodeIds, isCanvasLocked, draggedNodeId],
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (isCanvasLocked) return;
      const filtered = changes.filter((change: any) => {
        if (change.id) return visibleNodeIds.has(change.id);
        return true;
      });
      if (filtered.length > 0) actions.onEdgesChange(filtered);
    },
    [actions.onEdgesChange, isCanvasLocked, visibleNodeIds],
  );

  const handlePreview = useCallback(() => {
    actions.setPreviewMode(true);
  }, [actions.setPreviewMode]);

  const handleAIAssistant = useCallback(() => {
    if (isAIAssistantLocked) {
      toast.error('AI Ассистент доступен только в PRO');
      void nav.goToBilling();
      return;
    }
    toggleAIAssistantPanel();
  }, [isAIAssistantLocked, nav, toggleAIAssistantPanel]);

  const handleToggleGrid = useCallback(() => {
    setPreference('showGrid', !showGrid);
  }, [setPreference, showGrid]);

  const backgroundConfig = getCanvasBackgroundConfig(showGrid, boardSettings);

  const handleNodeMenuClose = useCallback(() => menus.setNodeMenu(null), [menus.setNodeMenu]);
  const handleEdgeMenuClose = useCallback(() => menus.setEdgeMenu(null), [menus.setEdgeMenu]);
  const handleQuickAddClose = useCallback(() => {
    menus.setQuickAdd(null);
    setConnectingFrom(null);
  }, [menus.setQuickAdd]);
  const handleEdgeEditClose = useCallback(() => menus.setEditingEdge(null), [menus.setEditingEdge]);
  const handleEdgeEditSubmit = useCallback(
    (value: string) => {
      if (!menus.editingEdge) return;
      actions.updateEdgeData(menus.editingEdge.id, { label: value });
      menus.setEditingEdge(null);
    },
    [menus.editingEdge, menus.setEditingEdge, actions.updateEdgeData],
  );

  return (
    <div
      className="h-full w-full relative bg-slate-100 overflow-hidden"
      ref={reactFlowWrapper}
      role="application"
      aria-label="Редактор квиза"
      style={{
        '--editor-primary': DS.colors.primary,
        '--editor-primary-hover': DS.colors.primaryHover,
      } as React.CSSProperties}
    >
      {isCanvasLoading && <LoadingScreen />}
      <LockBanner isLocked={isCanvasLocked} onUnlock={actions.toggleCanvasLock} />

      <EditorMenus
        isConnecting={isConnecting}
        nodeMenu={menus.nodeMenu}
        edgeMenu={menus.edgeMenu}
        quickAddMenu={menus.quickAdd}
        editingEdge={menus.editingEdge}
        onNodeMenuClose={handleNodeMenuClose}
        onEdgeMenuClose={handleEdgeMenuClose}
        onQuickAddClose={handleQuickAddClose}
        onEdgeEditClose={handleEdgeEditClose}
        onEdgeEditSubmit={handleEdgeEditSubmit}
        onDeleteNode={actions.deleteNode}
        onDeleteEdge={actions.deleteEdge}
        onEditFromMenu={handleEditFromMenu}
        onDuplicateFromMenu={handleDuplicate}
        onPreviewFromNode={handlePreviewFromNode}
        onQuickAddSelect={handleQuickAdd}
      />

      <ReactFlow
        onInit={onInit}
        nodes={visibleNodes}
        edges={visibleEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={actions.onConnect}
        nodeTypes={stableNodeTypes}
        edgeTypes={stableEdgeTypes}
        defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onPaneContextMenu={onPaneContextMenu}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        onEdgeDoubleClick={onEdgeDoubleClick}
        onConnectStart={handleConnectStart}
        onConnectEnd={handleConnectEnd}
        onNodeDragStart={handleNodeDragStart}
        onNodeDragStop={handleNodeDragStop}
        isValidConnection={isValidConnection}
        nodesDraggable={!isCanvasLocked}
        nodesConnectable={!isCanvasLocked}
        elementsSelectable={!isCanvasLocked}
        selectionOnDrag={false}
        multiSelectionKeyCode="Shift"
        defaultViewport={DEFAULT_VIEWPORT}
        minZoom={ZOOM.MIN}
        maxZoom={ZOOM.MAX}
        style={flowStyle}
        proOptions={{ hideAttribution: true }}
        snapToGrid={snapToGrid}
        snapGrid={SNAP_GRID}
        panOnScroll
        panOnDrag={true}
        connectionLineStyle={CONNECTION_LINE_STYLE}
        connectionLineType={ConnectionLineType.Bezier}
        onlyRenderVisibleElements={lowPowerMode}
      >
        {backgroundConfig.visible && !simplified && (
          <Background
            variant={backgroundConfig.variant}
            gap={backgroundConfig.gap}
            size={backgroundConfig.size}
            color={backgroundConfig.color}
          />
        )}
        <Controls
          position="bottom-left"
          className="!bg-white !border !border-slate-200 !shadow-lg !rounded-xl !overflow-hidden !m-4"
          showInteractive={false}
        />
        <Panel position="top-left" className="!m-4">
          <Breadcrumbs />
        </Panel>
        <Panel position="top-center" className="!m-4 flex flex-col items-center gap-2">
          <CanvasSearch />
          {!simplified && <StatusBar nodes={visibleNodes} edges={visibleEdges} />}
        </Panel>
        <Panel position="bottom-center" className="!m-4 !mb-8">
          <BottomControlBar
            onLayout={handleLayout}
            onPreview={handlePreview}
            onAIAssistant={handleAIAssistant}
            isAIAssistantOpen={isAIAssistantPanelVisible}
            isAIAssistantLocked={isAIAssistantLocked}
            showGrid={showGrid}
            onToggleGrid={handleToggleGrid}
          />
        </Panel>
        {!simplified && (
          <Panel position="bottom-right" className="!m-4">
            <EnhancedMinimap />
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
};

export default QuizEditor;
