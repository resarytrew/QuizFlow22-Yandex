import { CustomNodeType } from '../../types';

export const NODE_DRAG_MIME = 'application/reactflow';

const NODE_TYPES = new Set<string>(Object.values(CustomNodeType));

export function writeDraggedNodeType(
  dataTransfer: DataTransfer,
  nodeType: CustomNodeType,
): void {
  dataTransfer.setData(NODE_DRAG_MIME, nodeType);
  dataTransfer.setData('text/plain', nodeType);
  dataTransfer.effectAllowed = 'move';
}

export function readDraggedNodeType(
  dataTransfer: DataTransfer,
): CustomNodeType | null {
  const value =
    dataTransfer.getData(NODE_DRAG_MIME) ||
    dataTransfer.getData('text/plain');

  return NODE_TYPES.has(value) ? (value as CustomNodeType) : null;
}
