'use client';

import { motion } from 'framer-motion';

export function AgentVisualizer() {
  const jumpVariants = {
    animate: {
      y: [0, -30, 0],
      rotate: [0, 2, -2, 0],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  };

  const glowVariants = {
    animate: {
      scale: [0.8, 1.2, 0.8],
      opacity: [0.3, 0.7, 0.3],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  };

  return (
    <div className="relative w-full h-screen overflow-hidden flex items-center justify-center bg-slate-950">
      {/* Dynamic Background Glows */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-tr from-purple-600/40 via-transparent to-cyan-400/40 blur-[100px]"
        variants={glowVariants}
        animate="animate"
      />
      <motion.div
        className="absolute w-full h-full bg-purple-500/10 blur-[80px]"
        variants={glowVariants}
        animate="animate"
        style={{ animationDelay: '-2s' }}
      />
      
      {/* Full Screen Floating Image */}
      <motion.div
        className="absolute inset-0 z-10 w-full h-full"
        variants={jumpVariants}
        animate="animate"
      >
        <img 
          src="/image.png" 
          alt="Lumi AI Agent Background" 
          className="w-full h-full object-cover opacity-60"
          style={{ 
            filter: 'drop-shadow(0 0 30px rgba(6,182,212,0.3)) drop-shadow(0 0 60px rgba(124,58,237,0.2))' 
          }}
        />
        
        {/* Subtle overlay reflection */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent pointer-events-none" />
      </motion.div>

      {/* Floating Particles/Stars */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-white rounded-full shadow-[0_0_10px_#fff]"
          initial={{ opacity: 0.2, scale: 0.5 }}
          animate={{
            y: [0, -100, 0],
            opacity: [0.2, 1, 0.2],
            scale: [0.5, 1.5, 0.5],
            x: Math.sin(i) * 50,
          }}
          transition={{
            duration: 3 + i,
            repeat: Infinity,
            delay: i * 0.5,
            ease: 'easeInOut',
          }}
          style={{
            left: `${20 + i * 15}%`,
            top: `${40 + (i % 2) * 20}%`,
          }}
        />
      ))}
    </div>
  );
}

