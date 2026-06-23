// components/ui/GalleryCard.tsx
// Обёртка-карточка с 3D-tilt + spotlight эффектом. Использует общий хук useCard3D.

import React from 'react';
import { useCard3D } from '../../hooks/useCard3D';

interface GalleryCardProps {
  children?: React.ReactNode;
  className?: string;
  skeleton?: boolean;
  /** Отключить hover-эффекты (для текущего тарифа и т.п.). */
  staticEffect?: boolean;
}

const GalleryCardSkeleton: React.FC = () => (
  <div className="overflow-hidden rounded-xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] animate-pulse flex flex-col h-full">
    <div className="bg-gray-100" style={{ paddingBottom: '75%' }} />
    <div className="p-4 flex-1 flex flex-col gap-2">
      <div className="h-3.5 bg-gray-100 rounded w-4/5" />
      <div className="h-3 bg-gray-100 rounded w-1/3" />
      <div className="h-2.5 bg-gray-100 rounded w-3/4" />
      <div className="flex items-center gap-2 mt-auto pt-2">
        <div className="w-5 h-5 bg-gray-100 rounded-full" />
        <div className="h-2.5 bg-gray-100 rounded w-20" />
      </div>
    </div>
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-200/30 to-transparent -translate-x-full animate-shimmer" />
  </div>
);

const GalleryCard: React.FC<GalleryCardProps> = ({
  children,
  className = '',
  skeleton = false,
  staticEffect = false,
}) => {
  const { onMouseMove, onMouseLeave, style } = useCard3D({ disabled: staticEffect });

  if (skeleton) return <GalleryCardSkeleton />;

  return (
    <div
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={style}
      className={`
        relative group
        overflow-hidden rounded-xl
        bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]
        hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)]
        transition-shadow duration-300
        ${className}
      `}
    >
      {children}
      <div
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"
        style={{
          background: `radial-gradient(400px circle at var(--spot-x, 50%) var(--spot-y, 50%), rgba(99,102,241,0.08) 0%, transparent 70%)`,
        }}
      />
    </div>
  );
};

export default React.memo(GalleryCard);
