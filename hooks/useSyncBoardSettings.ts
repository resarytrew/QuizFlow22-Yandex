import { useEffect } from 'react';
import { usePreferencesStore } from '../store/usePreferencesStore';
import { useCanvasStore } from '../store/useCanvasStore';

export function useSyncBoardSettings(): void {
  const backgroundColor = usePreferencesStore((s) => s.preferences.boardBackgroundColor);
  const pattern = usePreferencesStore((s) => s.preferences.boardPattern);
  const lineColor = usePreferencesStore((s) => s.preferences.boardLineColor);
  const lineWidth = usePreferencesStore((s) => s.preferences.boardLineWidth);

  const updateBoardSettings = useCanvasStore((s) => s.updateBoardSettings);

  useEffect(() => {
    updateBoardSettings({
      backgroundColor,
      pattern,
      lineColor,
      lineWidth,
    });
  }, [backgroundColor, pattern, lineColor, lineWidth, updateBoardSettings]);
}
