declare module "jsdom" {
  interface JSDOMWindow extends Window {
    MouseEvent: typeof MouseEvent;
    close(): void;
  }

  export class JSDOM {
    constructor(html: string, options?: Record<string, unknown>);
    window: JSDOMWindow;
    static fragment(html: string): DocumentFragment;
  }
}
