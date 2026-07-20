import type { Node, Edge } from 'reactflow';
import type { NodeData, AutosavePayload } from '../types';

// --- Event types ---

export type StoreEvent =
  | { type: 'CANVAS_CLEAR' }
  | { type: 'CANVAS_RESET' }
  | { type: 'GROUP_CHANGED'; payload: { groupId: string | null } }
  | { type: 'QUIZ_LOADED'; payload: { nodes: Node<NodeData>[]; edges: Edge[] } }
  | { type: 'AUTOSAVE_RESTORE'; payload: AutosavePayload };

// --- Type-safe event bus ---

type Listener = (event: StoreEvent) => void;
const listeners = new Set<Listener>();

type EventMap = {
  [E in StoreEvent as E['type']]: E extends { payload: infer P } ? P : void;
};

export const storeEvents = {
  emit<T extends StoreEvent['type']>(
    type: T,
    ...args: EventMap[T] extends void ? [] : [payload: EventMap[T]]
  ): void {
    const event = args.length ? { type, payload: args[0] } : { type };
    listeners.forEach((l) => {
      try {
        l(event as StoreEvent);
      } catch (err) {
        console.error('[storeEvents] Listener error for event', type, err);
      }
    });
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  // Type-safe subscription for a specific event type
  on<T extends StoreEvent['type']>(
    type: T,
    handler: (payload: EventMap[T]) => void,
  ): () => void {
    const listener: Listener = (event) => {
      if (event.type === type) {
        handler(('payload' in event ? event.payload : undefined) as EventMap[T]);
      }
    };
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
