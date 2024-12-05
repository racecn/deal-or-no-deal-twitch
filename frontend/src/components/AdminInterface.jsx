import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { socket } from '../services/socketService';

const defaultAnimationConfig = {
  initialPause: 1500,
  zoomDuration: 1200,
  preopenPause: 800,
  revealDuration: 2000,
  finalPause: 500,
};

const AnimationConfig = ({ onSave }) => {
  const [config, setConfig] = useState(defaultAnimationConfig);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleConfigChange = (key, value) => {
    const numValue = Math.max(0, Math.min(10000, parseInt(value) || 0));
    setConfig(prev => ({ ...prev, [key]: numValue }));
  };

  const handlePresetClick = (preset) => {
    switch(preset) {
      case 'fast':
        setConfig({
          initialPause: 500,
          zoomDuration: 400,
          preopenPause: 300,
          revealDuration: 800,
          finalPause: 200,
        });
        break;
      case 'normal':
        setConfig(defaultAnimationConfig);
        break;
      case 'dramatic':
        setConfig({
          initialPause: 2000,
          zoomDuration: 1500,
          preopenPause: 1200,
          revealDuration: 2500,
          finalPause: 800,
        });
        break;
      default:
        break;
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
      <h3 className="text-xl font-bold mb-4">Animation Settings</h3>
      
      <div className="flex gap-4 mb-6">
        <Button 
          onClick={() => handlePresetClick('fast')}
          className="bg-blue-500 hover:bg-blue-700 text-white"
        >
          Fast Mode
        </Button>
        <Button 
          onClick={() => handlePresetClick('normal')}
          className="bg-green-500 hover:bg-green-700 text-white"
        >
          Normal Mode
        </Button>
        <Button 
          onClick={() => handlePresetClick('dramatic')}
          className="bg-purple-500 hover:bg-purple-700 text-white"
        >
          Dramatic Mode
        </Button>
      </div>

      <Button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="bg-gray-500 hover:bg-gray-700 text-white mb-4"
      >
        {showAdvanced ? 'Hide Advanced Settings' : 'Show Advanced Settings'}
      </Button>

      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Initial Pause (ms)
            </label>
            <Input
              type="number"
              value={config.initialPause}
              onChange={(e) => handleConfigChange('initialPause', e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Zoom Duration (ms)
            </label>
            <Input
              type="number"
              value={config.zoomDuration}
              onChange={(e) => handleConfigChange('zoomDuration', e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pre-open Pause (ms)
            </label>
            <Input
              type="number"
              value={config.preopenPause}
              onChange={(e) => handleConfigChange('preopenPause', e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reveal Duration (ms)
            </label>
            <Input
              type="number"
              value={config.revealDuration}
              onChange={(e) => handleConfigChange('revealDuration', e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Final Pause (ms)
            </label>
            <Input
              type="number"
              value={config.finalPause}
              onChange={(e) => handleConfigChange('finalPause', e.target.value)}
              className="w-full"
            />
          </div>
        </div>
      )}

      <Button
        onClick={() => onSave(config)}
        className="bg-green-600 hover:bg-green-700 text-white mt-4"
      >
        Apply Animation Settings
      </Button>
    </div>
  );
};

const AdminInterface = () => {
  const [gameState, setGameState] = useState({
    cases: {},
    selectedCase: null,
    currentOffer: null,
    suggestedOffer: null,
    gameStarted: false,
    playerName: null,
    phase: 'not_started',
    roundNumber: 1,
    casesToOpen: 6,
    casesRemaining: 26
  });

  const [playerNameInput, setPlayerNameInput] = useState('');
  const [customOffer, setCustomOffer] = useState('');
  const [error, setError] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    const handleStateUpdate = (data) => {
      console.log('State update received:', data);
      setGameState(data);
    };

    const handleReset = (data) => {
      console.log('Game reset received:', data);
      setGameState({
        cases: {},
        selectedCase: null,
        currentOffer: null,
        suggestedOffer: null,
        gameStarted: false,
        playerName: null,
        phase: 'not_started',
        roundNumber: 1,
        casesToOpen: 6,
        casesRemaining: 26
      });
    };

    socket.on('game_state', handleStateUpdate);
    socket.on('game_started', handleStateUpdate);
    socket.on('case_selected', handleStateUpdate);
    socket.on('case_opened', handleStateUpdate);
    socket.on('new_offer', handleStateUpdate);
    socket.on('deal_taken', handleStateUpdate);
    socket.on('offer_rejected', handleStateUpdate);
    socket.on('game_reset', handleReset);
    socket.on('suggest_offer', (data) => {
      console.log('Suggested offer received:', data);
      setGameState(prev => ({
        ...prev,
        suggestedOffer: data.suggestedOffer
      }));
    });
    socket.on('error', (data) => {
      console.error('Socket error:', data);
      setError(data.message);
    });

    return () => {
      socket.off('game_state');
      socket.off('game_started');
      socket.off('case_selected');
      socket.off('case_opened');
      socket.off('new_offer');
      socket.off('deal_taken');
      socket.off('offer_rejected');
      socket.off('game_reset');
      socket.off('suggest_offer');
      socket.off('error');
    };
  }, []);

  const startGame = () => {
    if (!playerNameInput.trim()) {
      setError('Please enter the player name');
      return;
    }
    socket.emit('start_game', { playerName: playerNameInput.trim() });
    setError('');
  };

  const resetGame = () => {
    setIsResetting(true);
    socket.emit('reset_game');
    setPlayerNameInput('');
    setCustomOffer('');
    setError('');
    
    setGameState({
      cases: {},
      selectedCase: null,
      currentOffer: null,
      suggestedOffer: null,
      gameStarted: false,
      playerName: null,
      phase: 'not_started',
      roundNumber: 1,
      casesToOpen: 6,
      casesRemaining: 26
    });
    
    setTimeout(() => setIsResetting(false), 1000);
  };

  const makeOffer = (useAutomatic = false) => {
    if (gameState.phase !== 'offer_phase') {
      console.log('Cannot make offer - wrong phase');
      return;
    }

    if (useAutomatic) {
      socket.emit('make_offer', { 
        offer: gameState.suggestedOffer,
        useSuggested: true 
      });
    } else {
      const offerAmount = parseFloat(customOffer);
      if (isNaN(offerAmount) || offerAmount <= 0) {
        setError('Please enter a valid offer amount');
        return;
      }
      socket.emit('make_offer', { 
        offer: offerAmount,
        useSuggested: false 
      });
      setCustomOffer('');
    }
  };

  const handleCaseClick = (caseNumber) => {
    if (gameState.phase === 'case_selection') {
      // For initial case selection
      socket.emit('select_case', { caseNumber });
    } else if (gameState.phase === 'opening_cases') {
      // For opening cases during rounds
      if (gameState.selectedCase && caseNumber !== gameState.selectedCase) {
        socket.emit('open_case', { caseNumber });
      }
    }
  };

  const handleAdminDealResponse = (accepted) => {
    if (gameState.phase !== 'offer_phase') {
      console.log('Cannot handle offer - wrong phase');
      return;
    }
    console.log(`Admin forcing ${accepted ? 'acceptance' : 'rejection'} of offer`);
    socket.emit('admin_handle_offer', { accepted });
  };

  const openCase = (caseNumber) => {
    if (gameState.selectedCase && caseNumber !== gameState.selectedCase && gameState.phase === 'opening_cases') {
      socket.emit('open_case', { caseNumber });
    }
  };

  const handleAnimationConfigSave = (config) => {
    socket.emit('update_animation_config', { config });
  };

  const renderGameStatus = () => {
    const statusMessages = {
      'not_started': 'Game not started',
      'case_selection': 'Waiting for player to select their case...',
      'opening_cases': `Opening cases: ${gameState.casesToOpen} remaining in round ${gameState.roundNumber}`,
      'offer_phase': 'Time to make an offer!',
      'deal_taken': 'Deal taken! Game Over',
      'game_over': 'Game Complete'
    };

    return statusMessages[gameState.phase] || 'Unknown state';
  };

  const renderOfferControls = () => {
    if (gameState.phase !== 'offer_phase') return null;

    return (
      <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
        <h3 className="text-xl font-bold mb-4">Banker Controls</h3>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="text-lg">
              Suggested Offer: <span className="font-bold text-green-600">
                ${gameState.suggestedOffer?.toLocaleString()}
              </span>
            </div>
            <Button 
              onClick={() => makeOffer(true)}
              className="bg-green-500 hover:bg-green-700 text-white"
            >
              Use Suggested Offer
            </Button>
          </div>
          <div className="flex items-center gap-4">
            <Input
              type="number"
              value={customOffer}
              onChange={(e) => setCustomOffer(e.target.value)}
              placeholder="Custom offer amount"
              className="w-48"
            />
            <Button 
              onClick={() => makeOffer(false)}
              className="bg-blue-500 hover:bg-blue-700 text-white"
            >
              Make Custom Offer
            </Button>
          </div>
          {gameState.currentOffer !== null && (
            <div className="flex items-center gap-4 pt-4 border-t">
              <div className="text-lg">
                Current Offer: <span className="font-bold text-green-600">
                  ${gameState.currentOffer.toLocaleString()}
                </span>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => handleAdminDealResponse(true)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Force DEAL
                </Button>
                <Button 
                  onClick={() => handleAdminDealResponse(false)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Force NO DEAL
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold">Deal or No Deal - Admin Control</h1>
            <Button
              onClick={resetGame}
              disabled={isResetting}
              className={`${
                isResetting 
                  ? 'bg-gray-400'
                  : 'bg-red-500 hover:bg-red-700'
              } text-white px-6 py-2`}
            >
              {isResetting ? 'Resetting...' : 'Reset Game'}
            </Button>
          </div>
          
          {!gameState.gameStarted ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 max-w-md">
                <Input
                  type="text"
                  value={playerNameInput}
                  onChange={(e) => setPlayerNameInput(e.target.value)}
                  placeholder="Enter player name"
                  className="flex-grow"
                />
                <Button 
                  onClick={startGame}
                  className="bg-blue-500 hover:bg-blue-700 text-white"
                >
                  Start Game
                </Button>
              </div>
              {error && <div className="text-red-500">{error}</div>}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-xl font-bold">
                  Player: {gameState.playerName}
                </div>
                <div className="text-lg font-medium text-blue-600">
                  {renderGameStatus()}
                </div>
              </div>
            </div>
          )}
        </div>

        {gameState.gameStarted && (
          <>
            <AnimationConfig onSave={handleAnimationConfigSave} />
            {renderOfferControls()}
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-bold mb-4">
                {gameState.phase === 'case_selection' 
                  ? 'Select Initial Case' 
                  : 'Case Controls'}
              </h3>
              <div className="grid grid-cols-6 gap-4">
                {Array.from({ length: 26 }, (_, i) => {
                  const caseNumber = (i + 1).toString();
                  const caseData = gameState.cases[caseNumber] || { opened: false, value: null };
                  
                  return (
                    <Button
                      key={caseNumber}
                      onClick={() => handleCaseClick(caseNumber)}
                      disabled={
                        !gameState.gameStarted || 
                        (gameState.phase !== 'case_selection' && (
                          !gameState.selectedCase || 
                          caseData.opened || 
                          caseNumber === gameState.selectedCase ||
                          gameState.phase !== 'opening_cases'
                        ))
                      }
                      className={`
                        relative group transition-all duration-300
                        ${caseData.opened 
                          ? 'bg-gray-400' 
                          : gameState.phase === 'case_selection'
                            ? 'bg-green-500 hover:bg-green-600'
                            : 'bg-blue-500 hover:bg-blue-700'
                        }
                        ${caseNumber === gameState.selectedCase ? 'ring-4 ring-yellow-400' : ''}
                        text-white p-4 h-auto min-h-[80px]
                      `}
                    >
                      <div className="text-center">
                        <div className="font-bold">Case {caseNumber}</div>
                        {caseData.opened && (
                          <div className="text-sm mt-1">
                            ${caseData.value?.toLocaleString()}
                          </div>
                        )}
                        {gameState.phase === 'case_selection' && !gameState.selectedCase && (
                          <div className="text-xs mt-1 text-white/80">
                            Click to Select
                          </div>
                        )}
                      </div>
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-md">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>Round: {gameState.roundNumber}</div>
                <div>Cases to open: {gameState.casesToOpen}</div>
                <div>Phase: {gameState.phase}</div>
                <div>Cases remaining: {gameState.casesRemaining}</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
export default AdminInterface;