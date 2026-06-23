import React, { useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface Props {
  value: number;
  className?: string;
}

const AnimatedCounter: React.FC<Props> = ({ value, className = '' }) => {
  const count = useMotionValue(0);
  const spring = useSpring(count, { stiffness: 60, damping: 20 });
  const rounded = useTransform(spring, v => Math.round(v));

  useEffect(() => {
    count.set(value);
  }, [value, count]);

  return <motion.span className={className}>{rounded}</motion.span>;
};

export default AnimatedCounter;
