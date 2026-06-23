import { BackgroundVariant } from 'reactflow';
import type { BoardSettings } from '../../types';

export interface CanvasBackgroundConfig {
  visible: boolean;
  variant: BackgroundVariant;
  gap: number;
  size: number;
  color: string;
}

export function getCanvasBackgroundConfig(
  showGrid: boolean,
  boardSettings: BoardSettings,
): CanvasBackgroundConfig {
  const variant =
    boardSettings.pattern === 'large'
      ? BackgroundVariant.Lines
      : boardSettings.pattern === 'medium'
        ? BackgroundVariant.Cross
        : BackgroundVariant.Dots;

  const gap =
    boardSettings.pattern === 'large' ? 40 : boardSettings.pattern === 'medium' ? 28 : 20;

  return {
    visible: showGrid && boardSettings.pattern !== 'none',
    variant,
    gap,
    size: boardSettings.lineWidth,
    color: boardSettings.lineColor,
  };
}
