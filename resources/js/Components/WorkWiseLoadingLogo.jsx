import React from 'react';
import { motion } from 'motion/react';

const lightBlue = "#5B9BD5";
const darkBlue = "#4472C4";

export default function WorkWiseLoadingLogo() {
  return (
    <motion.div
      initial={{ perspective: 1000 }}
      animate={{
        rotateY: [0, 10, -10, 0],
        rotateX: [0, -5, 5, 0],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className="relative w-32 h-32 flex items-center justify-center"
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full drop-shadow-2xl"
        xmlns="http://www.w3.org/2000/svg"
      >
        <motion.circle
          cx="22"
          cy="28"
          r="10"
          fill={lightBlue}
          animate={{ y: [0, -8, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
        />
        <motion.circle
          cx="78"
          cy="28"
          r="10"
          fill={lightBlue}
          animate={{ y: [0, -8, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
        />
        <g>
          <motion.path
            d="M15 42L28 78H42L29 42H15Z"
            fill={lightBlue}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
          <motion.path
            d="M28 78L43 42H57L42 78H28Z"
            fill={darkBlue}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
          />
          <motion.path
            d="M43 42L58 78H72L57 42H43Z"
            fill={lightBlue}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
          />
          <motion.path
            d="M58 78L71 42H85L72 78H58Z"
            fill={lightBlue}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.6 }}
          />
        </g>
        <motion.path
          d="M15 42L28 78L43 42L58 78L71 42"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          opacity="0.3"
          animate={{
            pathLength: [0, 1, 0],
            opacity: [0, 0.5, 0],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
      </svg>
      <motion.div
        className="absolute -bottom-2 w-16 h-2 bg-black/10 rounded-[100%] blur-md"
        animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.div>
  );
}
