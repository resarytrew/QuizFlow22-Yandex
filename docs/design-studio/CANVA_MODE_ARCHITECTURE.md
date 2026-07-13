# Embedded Canva Mode Architecture

Date: 2026-07-13

## Goal

The embedded Canva mode is a constrained free-layout layer inside the existing design mode and `LivePreview`.
It does not create a separate route, a second editor shell, a second Player, or a bitmap/canvas renderer.

The main Player remains DOM-based so accessibility, adaptive layout, forms, Telegram/MAX embedding, public Player and HTML export continue to work.

## LayoutDocument

Free layout is stored as a versioned `LayoutDocument`:

```ts
interface LayoutDocument {
  schemaVersion: number;
  mode: 'auto' | 'free';
  baseViewport: {
    width: number;
    height: number;
  };
  elements: Record<string, LayoutElement>;
  breakpoints?: {
    tablet?: LayoutOverrides;
    mobile?: LayoutOverrides;
  };
}

interface LayoutElement {
  id: string;
  role: DesignElementRole;
  frame: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  constraints: {
    horizontal: 'left' | 'center' | 'right' | 'stretch';
    vertical: 'top' | 'center' | 'bottom';
  };
  positionMode: 'flow' | 'free';
  order?: number;
  zIndex?: number;
  locked?: boolean;
  hidden?: boolean;
}
```

`schemaVersion` is currently `1`. The normalizer accepts missing versions as legacy draft documents and migrates them to version `1`.

## Storage And Inheritance

The model is stored as a compact extra under `designSettings.layoutDocuments`.

It supports the same inheritance strategy as element overrides:

1. Global layout.
2. Node type layout.
3. Current node layout.

Resolution order is:

```text
nodeId layout -> node type layout -> global layout -> auto layout
```

The editor must not copy a full layout into every node. Node-scoped layouts should be created only when a user explicitly chooses current-screen scope.

Drafts are stored under `layoutDocuments.drafts` so returning from free mode to auto can keep the free layout without silently deleting it.

## Auto Mode

Auto mode remains semantic and DOM-flow based.

The Player uses existing template layout rules and `layout.elementOrder`:

```ts
[
  'question-title',
  'media',
  'question-description',
  'answers-container',
  'primary-action',
]
```

Returning from free mode to auto restores this semantic order and writes the operation through `DesignHistory`.

## Free Mode Capture

When the user switches from auto to free:

1. The existing `DesignOverviewPanel` dispatches an editor-only measurement request.
2. `LivePreview` sends `MEASURE_LAYOUT_ELEMENTS` through `PreviewBridge`.
3. The DOM Player measures annotated elements with `getBoundingClientRect()`.
4. The Player returns `LAYOUT_ELEMENTS_MEASURED`.
5. The parent creates a normalized `LayoutDocument`.
6. The operation is written with `updateDesignSettings`, so undo/redo works.

This stage does not implement drag, resize, free placement UI, or absolute rendering. It only creates the safe document model.

## Coordinates

Saved coordinates are logical CSS-pixel coordinates relative to `baseViewport`, not raw browser viewport coordinates.

The conversion is:

```text
logicalX = measuredX * baseViewport.width / measuredViewport.width
logicalY = measuredY * baseViewport.height / measuredViewport.height
```

This keeps saved values independent from preview zoom, browser zoom, iframe offset and device pixel ratio. The bridge payload records viewport, scroll, device pixel ratio and safe area metadata, but the stored frame is normalized to the logical base viewport.

All numeric values are clamped and `NaN`/`Infinity` are rejected.

## Constraints

Role rules are derived from `ElementRegistry` and the Canva model:

- `canvas-background` occupies the full scene and cannot be moved.
- `question-card` is required and must stay within viewport bounds.
- `answers-container` is moved as a group.
- `primary-action` is functional, required and must stay reachable.
- Required forms and actions cannot be deleted or hidden.
- Functional elements cannot be rotated.
- Decorative elements can later be moved more freely.
- Text remains real DOM text.
- Inputs remain real HTML inputs.

Rotation is not supported in this model.

## Responsive Overrides

`LayoutDocument.breakpoints` stores optional tablet and mobile overrides as patches over the base document. Breakpoints can override element frame, constraints, position mode, order, z-index, lock and visibility.

The first implementation only normalizes and serializes these overrides. Applying them visually is a later rendering stage.

## PreviewBridge Integration

New parent-to-player message:

- `MEASURE_LAYOUT_ELEMENTS`

New player-to-parent message:

- `LAYOUT_ELEMENTS_MEASURED`

The bridge continues to validate:

- message source;
- origin;
- protocol version;
- payload shape;
- safe element IDs;
- allowed roles.

The bridge never accepts HTML, JavaScript, arbitrary CSS, DOM selectors from the user, or executable content.

## History

Mode transitions are design changes:

- auto -> free is one `DesignHistory` operation;
- free -> auto is one `DesignHistory` operation;
- undo restores the previous layout mode and document;
- redo reapplies the transition.

Switching editor mode between scenario/design does not affect layout history.

## Compatibility

Old quizzes do not contain `layoutDocuments`; they normalize to auto layout.

Public Player, HTML export and Telegram/MAX Player remain unaffected until a later stage explicitly applies `LayoutDocument` during rendering.

## Current Stage Limitations

- No drag.
- No resize.
- No free-layout visual renderer.
- No per-breakpoint editing UI.
- Free layout capture depends on available `data-design-role` and `data-design-element-id` annotations.
- Unsupported templates can still open safely; they may produce fewer measured elements.
