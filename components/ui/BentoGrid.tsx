import React from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';

interface BentoGridProps {
  children: React.ReactNode;
  className?: string;
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.95, rotateX: 5 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    rotateX: 0,
    transition: {
      duration: 0.5,
      delay: i * 0.04,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  }),
};

const BentoGrid: React.FC<BentoGridProps> = ({ children, className = '' }) => {
  const childrenArray = React.Children.toArray(children);

  return (
    <div
      className={`
        grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5
        gap-4 auto-rows-auto
        ${className}
      `}
    >
      <AnimatePresence mode="popLayout">
        {childrenArray.map((child, i) => (
          <motion.div
            key={(child as any)?.key || i}
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            custom={i}
            exit={{ opacity: 0, scale: 0.85, y: -20, rotateX: -5 }}
            layout
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {child}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default BentoGrid;
