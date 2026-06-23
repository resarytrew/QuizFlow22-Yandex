import React, { useRef, useMemo } from 'react';

const MagneticButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, className = '', ...props }) => {
  const ref = useRef<HTMLButtonElement>(null);
  
  const reduced = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  }, []);

  const onMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (reduced || !ref.current) return;
    const el = ref.current;
    const rect = el.getBoundingClientRect();
    const dx = (e.clientX - rect.left - rect.width / 2) * 0.25;
    const dy = (e.clientY - rect.top - rect.height / 2) * 0.25;
    el.style.transition = 'transform 0.1s var(--ease-out)';
    el.style.transform = `translate(${dx}px, ${dy}px)`;
  };
  
  const reset = () => { 
    if (ref.current) {
        ref.current.style.transition = 'transform 0.4s var(--ease-out)';
        ref.current.style.transform = 'translate(0,0)'; 
    }
  };

  return (
    <button
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      {...props}
      className={`group relative overflow-hidden will-change-transform ${className}`}
    >
      {/* shine effect */}
      <span className="pointer-events-none absolute -inset-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ background: 'linear-gradient(120deg, transparent 30%, rgba(255,255,255,.1) 50%, transparent 70%)' }} />
      <span className="relative inline-flex items-center justify-center gap-2 whitespace-nowrap">{children}</span>
    </button>
  );
};

export default MagneticButton;
