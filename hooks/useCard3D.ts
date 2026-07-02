// hooks/useCard3D.ts
// 3D-tilt + spotlight follow для карточек. Вынесен из GalleryCard для реюза в PricingCard.

import { useRef, useState, useCallback, useMemo, useEffect, type CSSProperties, type MouseEvent } from 'react';

interface UseCard3DOptions {
  /** Максимальный угол наклона в градусах (по умолчанию 8). */
  maxTilt?: number;
  /** Перспектива в px. */
  perspective?: number;
  /** Если true — отключает эффект (например, для текущего тарифа). */
  disabled?: boolean;
}

interface UseCard3DReturn {
  onMouseMove: (e: MouseEvent<HTMLElement>) => void;
  onMouseLeave: () => void;
  style: CSSProperties;
  reduced: boolean;
}

export function useCard3D(options: UseCard3DOptions = {}): UseCard3DReturn {
  const { maxTilt = 8, perspective = 800, disabled = false } = options;
  const rafRef = useRef<number>(0);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [spot, setSpot] = useState({ x: 50, y: 50 });

  const reduced = useMemo(() => {
    if (typeof window === 'undefined') return false;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return true;
    if (!window.matchMedia?.('(hover: hover)').matches) return true;
    return false;
  }, []);

  // Если устройство перешло в reduced/hover режим — сбрасываем к нулю.
  useEffect(() => {
    if (reduced || disabled) {
      setTilt({ x: 0, y: 0 });
      setSpot({ x: 50, y: 50 });
    }
  }, [reduced, disabled]);

  const onMouseMove = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      if (reduced || disabled) return;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const target = e.currentTarget as HTMLElement;
      rafRef.current = requestAnimationFrame(() => {
        const rect = target.getBoundingClientRect();
        const dx = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
        const dy = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
        setTilt({ x: -dy * maxTilt, y: dx * maxTilt });
        setSpot({
          x: ((e.clientX - rect.left) / rect.width) * 100,
          y: ((e.clientY - rect.top) / rect.height) * 100,
        });
      });
    },
    [reduced, disabled, maxTilt],
  );

  const onMouseLeave = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setTilt({ x: 0, y: 0 });
      setSpot({ x: 50, y: 50 });
    });
  }, []);

  const style: CSSProperties = {
    transform: `perspective(${perspective}px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
    willChange: 'transform',
    ['--spot-x' as string]: `${spot.x}%`,
    ['--spot-y' as string]: `${spot.y}%`,
  };

  return { onMouseMove, onMouseLeave, style, reduced };
}
