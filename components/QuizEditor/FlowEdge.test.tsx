import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PREFERENCES, usePreferencesStore } from '../../store/usePreferencesStore';
import { FlowEdge } from './FlowEdge';

vi.mock('reactflow', () => ({
  getBezierPath: () => ['M0 0 C0 0 100 100 100 100', 50, 50],
  BaseEdge: ({ id }: { id: string }) => <path data-testid={id} />,
  EdgeLabelRenderer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const edgeProps = {
  id: 'edge-1',
  source: 'source',
  target: 'target',
  sourceX: 0,
  sourceY: 0,
  targetX: 100,
  targetY: 100,
  sourcePosition: 'right',
  targetPosition: 'left',
  markerEnd: undefined,
  style: {},
  data: {},
  selected: false,
} as unknown as React.ComponentProps<typeof FlowEdge>;

describe('FlowEdge animations', () => {
  beforeEach(() => {
    usePreferencesStore.setState({
      preferences: { ...DEFAULT_PREFERENCES },
      presets: [],
      activePresetId: null,
    });
  });

  it('renders the moving marker when edge animations are enabled', () => {
    const { container } = render(
      <svg>
        <FlowEdge {...edgeProps} />
      </svg>,
    );

    expect(container.querySelector('.flow-edge-dot')).not.toBeNull();
    expect(container.querySelector('animateMotion')).not.toBeNull();
  });

  it('does not render SVG animations when edge animations are disabled', () => {
    usePreferencesStore.getState().setPreference('edgeAnimations', false);
    const { container } = render(
      <svg>
        <FlowEdge {...edgeProps} />
      </svg>,
    );

    expect(container.querySelector('.flow-edge-dot')).toBeNull();
    expect(container.querySelector('animateMotion')).toBeNull();
  });

  it.each(['reduceMotion', 'simplified'] as const)(
    'does not render SVG animations when %s is enabled',
    (preference) => {
      usePreferencesStore.getState().setPreference(preference, true);
      const { container } = render(
        <svg>
          <FlowEdge {...edgeProps} />
        </svg>,
      );

      expect(container.querySelector('.flow-edge-dot')).toBeNull();
      expect(container.querySelector('animateMotion')).toBeNull();
    },
  );
});
