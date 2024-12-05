import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase } from "lucide-react";
import { socket } from '../services/socketService';

const CaseOpeningCutscene = ({ caseNumber, value, onComplete }) => {
  const [stage, setStage] = useState('initial');
  const [showDramaPulse, setShowDramaPulse] = useState(false);
  const [config, setConfig] = useState({
    initialPause: 1500,
    zoomDuration: 1200,
    preopenPause: 800,
    revealDuration: 2000,
    finalPause: 500,
  });

  useEffect(() => {
    const handleAnimationConfig = (data) => {
      setConfig(data.config);
    };

    socket.on('animation_config', handleAnimationConfig);
    return () => socket.off('animation_config', handleAnimationConfig);
  }, []);

  useEffect(() => {
    const sequence = async () => {
      // Initial dramatic pause with pulsing
      setShowDramaPulse(true);
      await new Promise(resolve => setTimeout(resolve, config.initialPause));
      
      // Zoom in with anticipation
      setStage('zoom');
      await new Promise(resolve => setTimeout(resolve, config.zoomDuration));
      
      // Dramatic pause before opening
      setShowDramaPulse(true);
      await new Promise(resolve => setTimeout(resolve, config.preopenPause));
      
      // Open case
      setStage('open');
      setShowDramaPulse(false);
      await new Promise(resolve => setTimeout(resolve, config.revealDuration));
      
      // Final dramatic pause
      setStage('complete');
      await new Promise(resolve => setTimeout(resolve, config.finalPause));
      onComplete();
    };
    
    sequence();
  }, [config, onComplete]);

  return (
    <AnimatePresence>
      {stage !== 'complete' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
        >
          {/* Dramatic spotlight */}
          <motion.div
            className="absolute inset-0 bg-gradient-radial from-yellow-400/10 via-transparent to-transparent"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ 
              opacity: showDramaPulse ? [0.2, 0.4, 0.2] : 0.2,
              scale: stage === 'zoom' ? 1.2 : 1
            }}
            transition={{
              opacity: { repeat: Infinity, duration: 1 },
              scale: { duration: config.zoomDuration / 1000 }
            }}
          />

          <motion.div
            className="relative"
            initial={{ scale: 0.5 }}
            animate={{
              scale: stage === 'zoom' ? 1.8 : 1,
              rotateY: stage === 'open' ? 180 : 0,
              y: stage === 'zoom' ? -20 : 0
            }}
            transition={{
              duration: config.revealDuration / 1000,
              type: "spring",
              stiffness: 70,
              damping: 15
            }}
          >
            {/* Case front */}
            <motion.div
              className={`w-48 h-64 bg-gradient-to-br from-yellow-500 to-yellow-700 rounded-xl flex flex-col items-center justify-center shadow-2xl
                ${stage === 'open' ? 'backface-hidden' : ''}`}
            >
              <Briefcase className="w-16 h-16 text-white mb-4" />
              <motion.div 
                className="text-4xl font-bold text-white"
                animate={{ scale: showDramaPulse ? [1, 1.1, 1] : 1 }}
                transition={{ repeat: Infinity, duration: 1 }}
              >
                #{caseNumber}
              </motion.div>
            </motion.div>
            
            {/* Case back (value reveal) */}
            <motion.div
              className="absolute inset-0 w-48 h-64 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex flex-col items-center justify-center backface-hidden rotate-y-180"
            >
              <div className="text-xl font-bold text-white mb-4">Case #{caseNumber}</div>
              <motion.div
                className="text-4xl font-bold text-yellow-400"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: config.revealDuration / 2000, duration: 0.8, type: "spring" }}
              >
                ${value?.toLocaleString()}
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Dramatic rays */}
          <motion.div
            className="absolute inset-0 pointer-events-none overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: stage === 'open' ? 1 : 0 }}
            transition={{ duration: config.revealDuration / 1000 }}
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute top-1/2 left-1/2 h-[200vh] w-2 bg-gradient-to-t from-yellow-400/40 to-transparent"
                style={{
                  transform: `rotate(${i * 30}deg)`,
                  transformOrigin: 'top',
                }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: stage === 'open' ? 1 : 0 }}
                transition={{ 
                  duration: config.revealDuration / 1000,
                  delay: stage === 'open' ? i * 0.05 : 0
                }}
              />
            ))}
          </motion.div>

          {/* Suspense text */}
          <motion.div
            className="absolute bottom-20 left-0 right-0 text-center"
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: showDramaPulse ? 1 : 0,
              scale: showDramaPulse ? [1, 1.05, 1] : 1
            }}
            transition={{
              scale: { repeat: Infinity, duration: 1 }
            }}
          >
            <div className="text-2xl font-bold text-yellow-400">
              {stage === 'initial' ? "Ready to reveal..." : "Opening case..."}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CaseOpeningCutscene;