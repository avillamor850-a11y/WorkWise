'use client';

import React from 'react';
import LoadingAnimation from '@/components/LoadingAnimation';
import { motion } from 'motion/react';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-100 rounded-full blur-3xl opacity-50" />
      </div>

      <div className="relative z-10 text-center space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
            Experience the <span className="text-blue-500">Motion</span>
          </h1>
          <p className="mt-4 text-slate-600 text-lg max-w-md mx-auto">
            A playful, 3D-animated loading sequence crafted with precision and fluid transitions.
          </p>
        </motion.div>

        <div className="relative">
          <LoadingAnimation />
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="flex flex-col items-center gap-2"
        >
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-blue-400 rounded-full"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 1, 0.3],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
          <span className="text-xs font-mono uppercase tracking-widest text-slate-400">
            Initializing System
          </span>
        </motion.div>
      </div>

      {/* Award-winning footer detail */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ delay: 2 }}
        className="absolute bottom-8 text-[10px] uppercase tracking-[0.3em] text-slate-400 font-medium"
      >
        Crafted for Excellence &bull; 2026 Edition
      </motion.div>
    </main>
  );
}
