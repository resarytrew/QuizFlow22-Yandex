import React, { useEffect, useState } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';

const ScrollToTop: React.FC = () => {
  const { scrollYProgress } = useScroll();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = scrollYProgress.on('change', v => {
      setIsVisible(v > 0.2);
    });
    return unsubscribe;
  }, [scrollYProgress]);

  const pathLength = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

  if (!isVisible) return null;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-8 right-8 z-50 w-11 h-11 rounded-2xl bg-white/80 backdrop-blur-xl border border-gray-200/60 shadow-lg shadow-gray-200/50 flex items-center justify-center hover:bg-white hover:shadow-xl transition-all"
    >
      <svg width="44" height="44" viewBox="0 0 44 44" className="absolute inset-0 -rotate-90">
        <circle cx="22" cy="22" r="18" fill="none" stroke="#e5e7eb" strokeWidth="2" />
        <motion.circle
          cx="22" cy="22" r="18"
          fill="none"
          stroke="#6366f1"
          strokeWidth="2"
          strokeLinecap="round"
          style={{ pathLength }}
        />
      </svg>
      <svg className="w-4 h-4 text-gray-500 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    </motion.button>
  );
};

export default ScrollToTop;
