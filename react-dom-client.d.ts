declare module 'react-dom/client' {
  import * as React from 'react';
  
  interface Root {
    render(children: React.ReactNode): void;
    unmount(): void;
  }
  
  function createRoot(container: Element | DocumentFragment, options?: CreateRootOptions): Root;
  
  interface CreateRootOptions {
    onRecoverableError?: (error: unknown, errorInfo: { digest?: string }) => void;
    identifierPrefix?: string;
  }
  
  // Re-export everything from react-dom
  export * from 'react-dom';
  export { createRoot };
}