import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CaseOpeningCutscene = ({ caseNumber, value, onComplete }) => {
  const [stage, setStage] = useState('initial');
  
  useEffect(() => {
    const sequence = async () => {
      // Stage timing sequence
      await new Promise(resolve => setTimeout(resolve, 500)); // Initial pause
      setStage('zoom');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Zoom duration
      setStage('open');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Show value duration
      setStage('complete');
      await new Promise(resolve => setTimeout(resolve, 500)); // Final pause
      onComplete();
    };
    
    sequence();
  }, [onComplete]);

  return (
    <AnimatePresence>
      {stage !== 'complete' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
        >
          <motion.div 
            className="relative"
            initial={{ scale: 0.5 }}
            animate={{ 
              scale: stage === 'zoom' ? 1.5 : 1,
              rotateY: stage === 'open' ? 180 : 0
            }}
            transition={{ 
              duration: 1,
              type: "spring",
              stiffness: 100
            }}
          >
            {/* Case front */}
            <motion.div
              className={`w-48 h-64 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center shadow-2xl
                ${stage === 'open' ? 'backface-hidden' : ''}`}
            >
              <span className="text-4xl font-bold text-white">#{caseNumber}</span>
            </motion.div>
            
            {/* Case back (value reveal) */}
            <motion.div
              className="absolute inset-0 w-48 h-64 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex flex-col items-center justify-center backface-hidden rotate-y-180"
            >
              <div className="text-lg font-bold text-white mb-2">Case #{caseNumber}</div>
              <motion.div 
                className="text-3xl font-bold text-yellow-400"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 1, duration: 0.5 }}
              >
                ${value?.toLocaleString()}
              </motion.div>
            </motion.div>
          </motion.div>
          
          {/* Dramatic light rays */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: stage === 'open' ? 1 : 0 }}
            transition={{ duration: 1 }}
          >
            <div className="absolute inset-0 bg-gradient-radial from-yellow-400/20 to-transparent" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CaseOpeningCutscene;