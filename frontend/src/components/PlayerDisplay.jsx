import React, { useState, useEffect, useRef } from 'react';
import { Button } from "./ui/button";
import { socket } from '../services/socketService';
import { Briefcase } from "lucide-react";

const formatMoney = (amount) => {
  if (amount >= 1000000) return `$${(amount/1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount/1000).toFixed(1)}K`;
  return `$${amount}`;
};

const ValuesBoard = ({ cases, side }) => {
  const leftValues = [
    0.01, 1, 5, 10, 25, 50, 75, 100,
    200, 300, 400, 500, 750, 1000
  ];
  
  const rightValues = [
    5000, 10000, 25000, 50000, 75000,
    100000, 200000, 300000, 400000,
    500000, 750000, 1000000
  ];

  const isValueEliminated = (value) => {
    return Object.values(cases).some(c => c.opened && c.value === value);
  };

  const renderValue = (value) => (
    <div
      key={value}
      className={`p-3 text-lg font-bold rounded-lg ${
        isValueEliminated(value) 
          ? 'bg-gray-200 text-gray-400 line-through'
          : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
      } transition-all duration-500`}
    >
      {formatMoney(value)}
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-2">
      {side === 'left' ? leftValues.map(renderValue) : rightValues.map(renderValue)}
    </div>
  );
};

const CaseOpeningCutscene = ({ caseNumber, value, onComplete }) => {
  const [stage, setStage] = useState('initial');
  const [showDramaPulse, setShowDramaPulse] = useState(false);

  useEffect(() => {
    const sequence = async () => {
      setShowDramaPulse(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setStage('zoom');
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      setShowDramaPulse(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setStage('open');
      setShowDramaPulse(false);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setStage('complete');
      await new Promise(resolve => setTimeout(resolve, 500));
      onComplete();
    };
    
    sequence();
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      <div className={`absolute inset-0 bg-gradient-radial from-yellow-400/10 via-transparent to-transparent transition-all duration-1000
        ${showDramaPulse ? 'opacity-40' : 'opacity-20'}
        ${stage === 'zoom' ? 'scale-120' : 'scale-100'}`}
      />

      <div className={`relative transition-all duration-1000
        ${stage === 'zoom' ? 'scale-150 -translate-y-8' : 'scale-100 translate-y-0'}
        ${stage === 'open' ? 'rotate-y-180' : 'rotate-y-0'}`}
      >
        {/* Case front */}
        <div className={`w-48 h-64 bg-gradient-to-br from-yellow-500 to-yellow-700 rounded-xl flex flex-col items-center justify-center shadow-2xl
          ${stage === 'open' ? 'backface-hidden' : ''}`}
        >
          <Briefcase className="w-16 h-16 text-white mb-4" />
          <div className={`text-4xl font-bold text-white transition-transform duration-1000
            ${showDramaPulse ? 'scale-110' : 'scale-100'}`}
          >
            #{caseNumber}
          </div>
        </div>
        
        {/* Case back (value reveal) */}
        <div className="absolute inset-0 w-48 h-64 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex flex-col items-center justify-center backface-hidden rotate-y-180">
          <div className="text-xl font-bold text-white mb-4">Case #{caseNumber}</div>
          <div className={`text-4xl font-bold text-yellow-400 transition-all duration-800
            ${stage === 'open' ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}
          >
            ${value?.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Dramatic rays */}
      <div className={`absolute inset-0 pointer-events-none overflow-hidden transition-opacity duration-1000
        ${stage === 'open' ? 'opacity-100' : 'opacity-0'}`}
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className={`absolute top-1/2 left-1/2 h-[200vh] w-2 bg-gradient-to-t from-yellow-400/40 to-transparent transition-transform duration-1000
              origin-top`}
            style={{
              transform: `rotate(${i * 30}deg) scaleY(${stage === 'open' ? 1 : 0})`,
              transitionDelay: `${i * 50}ms`
            }}
          />
        ))}
      </div>

      {/* Suspense text */}
      <div className={`absolute bottom-20 left-0 right-0 text-center transition-all duration-1000
        ${showDramaPulse ? 'opacity-100 scale-105' : 'opacity-0 scale-100'}`}
      >
        <div className="text-2xl font-bold text-yellow-400">
          {stage === 'initial' ? "Ready to reveal..." : "Opening case..."}
        </div>
      </div>
    </div>
  );
};

const PlayerDisplay = () => {
  const [gameState, setGameState] = useState({
    cases: {},
    selectedCase: null,
    currentOffer: null,
    gameStarted: false,
    playerName: null,
    phase: 'not_started',
    roundNumber: 1,
    casesToOpen: 6,
    casesRemaining: 26
  });

  const [showCelebration, setShowCelebration] = useState(false);
  const [openingAnimation, setOpeningAnimation] = useState({
    isPlaying: false,
    caseNumber: null,
    value: null
  });

  const previousCases = useRef({});
  const pendingStateUpdate = useRef(null);

  useEffect(() => {
    const handleStateUpdate = (data) => {
      console.log('State update received:', data);
      
      if (data.phase === 'deal_taken') {
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 5000);
        setGameState(data);
        return;
      }

      const newlyOpenedCase = Object.entries(data.cases || {}).find(
        ([num, caseData]) => caseData.opened && !previousCases.current[num]?.opened
      );

      if (newlyOpenedCase) {
        const [caseNumber, caseData] = newlyOpenedCase;
        pendingStateUpdate.current = data;
        
        setOpeningAnimation({
          isPlaying: true,
          caseNumber,
          value: caseData.value
        });
      } else {
        setGameState(data);
        previousCases.current = data.cases;
      }
    };

    const events = [
      'game_state', 'game_started', 'case_selected', 
      'case_opened', 'new_offer', 'deal_taken', 'offer_rejected'
    ];

    events.forEach(event => {
      socket.on(event, handleStateUpdate);
    });

    socket.on('error', (data) => console.error('Socket error:', data));

    return () => {
      events.forEach(event => {
        socket.off(event);
      });
      socket.off('error');
    };
  }, []);

  const handleAnimationComplete = () => {
    if (pendingStateUpdate.current) {
      setGameState(pendingStateUpdate.current);
      previousCases.current = pendingStateUpdate.current.cases;
      pendingStateUpdate.current = null;
    }
    setOpeningAnimation({
      isPlaying: false,
      caseNumber: null,
      value: null
    });
  };

  const selectInitialCase = (caseNumber) => {
    if (gameState.phase === 'case_selection') {
      socket.emit('select_case', { caseNumber });
    }
  };

  const handleOffer = (accepted) => {
    if (gameState.phase !== 'offer_phase') return;
    socket.emit(accepted ? 'accept_offer' : 'reject_offer');
  };

  const renderGameHeader = () => (
    <div className="relative">
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-blue-900/50 to-transparent pointer-events-none" />
      <div className="text-center pt-8 pb-4 relative">
        <h1 className="text-6xl font-bold text-white mb-4 text-shadow-lg">
          Deal or No Deal
        </h1>
        {gameState.playerName && (
          <div className="text-3xl text-yellow-400 font-bold animate-pulse">
            {gameState.playerName}
          </div>
        )}
      </div>
    </div>
  );

  const renderGameStatus = () => {
    const statusMessages = {
      'not_started': 'Waiting for game to start...',
      'case_selection': 'Choose your lucky case!',
      'opening_cases': `Round ${gameState.roundNumber}: Open ${gameState.casesToOpen} more cases`,
      'offer_phase': "THE BANKER IS CALLING!",
      'deal_taken': `CONGRATULATIONS! YOU WON $${gameState.currentOffer?.toLocaleString()}!`,
      'game_over': 'Game Complete'
    };

    const shouldShowBankerCalling = gameState.phase === 'offer_phase' && gameState.currentOffer === null;

    return (
      <div className="text-center mb-8">
        <h2 className={`text-3xl font-bold mb-2 ${
          gameState.phase === 'deal_taken' ? 'text-green-500 animate-pulse' : 
          shouldShowBankerCalling ? 'text-red-500 animate-bounce' :
          'text-white'
        }`}>
          {shouldShowBankerCalling 
            ? statusMessages[gameState.phase]
            : gameState.phase === 'offer_phase'
              ? ''
              : statusMessages[gameState.phase]
          }
        </h2>
        {gameState.selectedCase && gameState.phase !== 'case_selection' && (
          <div className="text-2xl text-yellow-400 flex items-center justify-center gap-2">
            <span>Your Case:</span>
            <Briefcase className="w-8 h-8" />
            <span>#{gameState.selectedCase}</span>
          </div>
        )}
      </div>
    );
  };

  const renderBankerOffer = () => {
    if (gameState.currentOffer === null || gameState.phase !== 'offer_phase') return null;

    return (
      <div className="mb-8 text-center animate-fadeIn">
        <div className="bg-black/80 p-8 rounded-2xl shadow-2xl border-2 border-yellow-500 max-w-2xl mx-auto">
          <h2 className="text-4xl font-bold mb-4 text-white">Banker's Offer</h2>
          <div className="text-7xl font-bold text-green-500 mb-8 animate-pulse">
            ${gameState.currentOffer.toLocaleString()}
          </div>
          <div className="flex justify-center gap-8">
            <Button 
              onClick={() => handleOffer(true)}
              className="bg-green-600 hover:bg-green-700 text-white text-3xl px-12 py-6 rounded-xl transform hover:scale-105 transition-all"
            >
              DEAL
            </Button>
            <Button 
              onClick={() => handleOffer(false)}
              className="bg-red-600 hover:bg-red-700 text-white text-3xl px-12 py-6 rounded-xl transform hover:scale-105 transition-all"
            >
              NO DEAL
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 via-blue-800 to-blue-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {renderGameHeader()}
        {renderGameStatus()}
        {renderBankerOffer()}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-black/30 p-6 rounded-xl backdrop-blur-sm">
            <ValuesBoard cases={gameState.cases} side="left" />
          </div>

          <div className="bg-black/30 p-6 rounded-xl backdrop-blur-sm">
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
              {Array.from({ length: 26 }, (_, i) => {
                const caseNumber = (i + 1).toString();
                const caseData = gameState.cases[caseNumber] || { opened: false, value: null };
                
                return (
                  <Button
                    key={caseNumber}
                    onClick={() => selectInitialCase(caseNumber)}
                    disabled={
                      !gameState.gameStarted || 
                      gameState.phase !== 'case_selection' || 
                      caseData.opened
                    }
                    className={`
                      relative group transition-all duration-300
                      ${caseData.opened ? 'bg-gray-700' : 'bg-gradient-to-br from-yellow-400 to-yellow-600'}
                      ${caseNumber === gameState.selectedCase ? 'ring-4 ring-white animate-pulse' : ''}
                      h-24 rounded-lg transform hover:scale-105
                      ${caseData.opened ? 'opacity-50' : 'hover:shadow-lg'}
                      flex flex-col items-center justify-center p-2
                    `}
                  >
                    <Briefcase className="w-8 h-8 mb-1" />
                    <div className="font-bold text-sm">{caseNumber}</div>
                    {caseData.opened && (
                      <div className="text-sm font-bold text-yellow-300 mt-1">
                        ${caseData.value?.toLocaleString()}
                      </div>
                    )}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="bg-black/30 p-6 rounded-xl backdrop-blur-sm">
            <ValuesBoard cases={gameState.cases} side="right" />
          </div>
        </div>

        {gameState.gameStarted && (
          <div className="bg-black/30 p-4 rounded-xl backdrop-blur-sm text-white">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>Round: {gameState.roundNumber}</div>
              <div>Cases to Open: {gameState.casesToOpen}</div>
              <div>Phase: {gameState.phase}</div>
              <div>Cases Remaining: {gameState.casesRemaining}</div>
            </div>
          </div>
        )}

        {showCelebration && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="text-center animate-bounce">
              <h2 className="text-6xl font-bold text-yellow-400 mb-4">
                CONGRATULATIONS!
              </h2>
              <p className="text-4xl text-white">
                You won ${gameState.currentOffer?.toLocaleString()}!
              </p>
            </div>
          </div>
        )}

        {openingAnimation.isPlaying && (
          <CaseOpeningCutscene
            caseNumber={openingAnimation.caseNumber}
            value={openingAnimation.value}
            onComplete={handleAnimationComplete}
          />
        )}
      </div>
    </div>
  );
};

export default PlayerDisplay;