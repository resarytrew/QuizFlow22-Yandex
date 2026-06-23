// Global ambient declarations to ensure import.meta.env is recognized by tsc,
// and to provide minimal types for untyped runtime dependencies.

interface ImportMetaEnv {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  VITE_AI_PROXY_URL?: string;
  VITE_PRIMARY_SITE_URL?: string;
  VITE_ADDITIONAL_SITE_ORIGINS?: string;
  [key: string]: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "clsx" {
  function clsx(...args: any[]): string;
  export { clsx };
  export default clsx;
}

// canvas-confetti has no published type definitions. Declare the call signature
// we actually use.
declare module "canvas-confetti" {
  type Options = Record<string, unknown>;
  interface ConfettiFn {
    (options?: Options): Promise<unknown>;
    create(
      origin?: { x?: number; y?: number },
      options?: Options,
    ): ConfettiFn;
  }
  const confetti: ConfettiFn;
  export default confetti;
}

// dagre has no published type definitions. Declare the symbols actually used.
declare module "dagre" {
  interface GraphLabel {
    [key: string]: unknown;
  }
  interface Graph {
    setDefaultEdgeLabel(label: GraphLabel | (() => GraphLabel)): void;
    setGraph(label: GraphLabel): void;
    setNode(id: string, label?: GraphLabel): void;
    setEdge(source: string, target: string, label?: GraphLabel, name?: string): void;
    node(id: string, label?: GraphLabel): { x: number; y: number } | null;
    edge(source: string, target: string, label?: GraphLabel): unknown;
  }
  const dagre: {
    graphlib: { Graph: new (opts?: { directed?: boolean; multigraph?: boolean; compound?: boolean }) => Graph };
    layout(g: Graph): void;
  };
  export default dagre;
}

// Some legacy modal files still import "react-dom" directly instead of
// "react-dom/client". Declare the symbols we actually use; the real
// runtime package re-exports them but the local types only ship the
// `react-dom/client` entry.
declare module "react-dom" {
  import { ReactNode, ReactPortal } from "react";
  export function createPortal(
    children: ReactNode,
    container: Element | DocumentFragment,
    key?: string | null,
  ): ReactPortal;
  export const version: string;
}
