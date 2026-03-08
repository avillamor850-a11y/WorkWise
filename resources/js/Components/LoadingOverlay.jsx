import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import WorkWiseLoadingLogo from './WorkWiseLoadingLogo';

export default function LoadingOverlay({ visible }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-md bg-slate-500/10"
          aria-live="polite"
          aria-busy="true"
          role="status"
        >
          <WorkWiseLoadingLogo />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
