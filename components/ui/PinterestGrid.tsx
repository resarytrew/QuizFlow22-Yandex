import React from 'react';
import { motion } from 'framer-motion';

interface PinterestGridProps {
  children: React.ReactNode;
  className?: string;
}

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.45,
      delay: i * 0.04,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  }),
};

const PinterestGrid: React.FC<PinterestGridProps> = ({ children, className = '' }) => {
  const items = React.Children.toArray(children);

  return (
    <div className={`columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-4 ${className}`}>
      {items.map((child, i) => (
        <motion.div
          key={React.isValidElement(child) && child.key !== null ? child.key : i}
          custom={i}
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="break-inside-avoid mb-4"
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
};

export default PinterestGrid;
