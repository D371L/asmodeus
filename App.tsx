import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Player } from './types';
import { INITIAL_PLAYERS, WHEEL_COLORS } from './constants';
import Wheel from './components/Wheel';
import Controls from './components/Controls';
import WinnerModal from './components/WinnerModal';
import { Play, Zap, History, Trophy } from 'lucide-react';
import { playTick, playWin, playSpinStart } from './utils/audio';

// Helper for cubic-bezier(0.1, 0, 0.18, 1) approximation
// We need this to calculate where the wheel IS during the JS loop to play sounds correctly
function cubicBezier(t: number): number {
    const p0 = 0, p1 = 0, p2 = 0.18, p3 = 1; // Simplified for the specific curve
    // Since x1=0.1, y1=0 and x2=0.18, y2=1. 
    // This is a custom approximation for performance:
    // It starts very fast and decays exponentially.
    // 1 - (1-t)^4 is a standard EaseOutQuart which is close to the CSS look
    return 1 - Math.pow(1 - t, 4);
}

const App: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>(
    INITIAL_PLAYERS.map((name, i) => ({
      id: crypto.randomUUID(),
      name,
      color: WHEEL_COLORS[i % WHEEL_COLORS.length],
    }))
  );

  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<Player | null>(null);
  const [history, setHistory] = useState<Player[]>([]);
  const [eliminationMode, setEliminationMode] = useState(false);
  
  // Audio state refs
  const lastTickRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  
  const wheelContainerRef = useRef<HTMLDivElement>(null);
  const [wheelSize, setWheelSize] = useState(300);

  useEffect(() => {
    const handleResize = () => {
      if (wheelContainerRef.current) {
        const { width, height } = wheelContainerRef.current.getBoundingClientRect();
        const isMobile = window.innerWidth < 1024;
        const dimension = isMobile ? width : Math.min(width, height);
        const padding = isMobile ? 40 : 40;
        setWheelSize((dimension / 2) - padding);
      }
    };
    
    const debouncedResize = () => requestAnimationFrame(handleResize);

    window.addEventListener('resize', debouncedResize);
    handleResize(); 
    
    return () => window.removeEventListener('resize', debouncedResize);
  }, []);

  // Keyboard support (Spacebar to spin)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isSpinning && !winner && players.length >= 2) {
        // Prevent scrolling down
        e.preventDefault();
        handleSpin();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSpinning, winner, players]);

  const handleAddPlayer = (name: string, color: string) => {
    setPlayers((prev) => [...prev, { id: crypto.randomUUID(), name, color }]);
  };

  const handleRemovePlayer = (id: string) => {
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  };

  const handleReset = () => {
    if (confirm("Reset all players?")) {
      setPlayers(
        INITIAL_PLAYERS.map((name, i) => ({
          id: crypto.randomUUID(),
          name,
          color: WHEEL_COLORS[i % WHEEL_COLORS.length],
        }))
      );
      setHistory([]);
      setWinner(null);
    }
  };

  const handleSpin = useCallback(() => {
    if (isSpinning || players.length < 2) return;

    playSpinStart();
    setWinner(null);
    setIsSpinning(true);
    
    if (window.innerWidth < 1024) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // CSS Animation Duration
    const duration = 10000; 

    const spinCount = 8; // More spins for dramatic effect
    const randomDegree = Math.floor(Math.random() * 360);
    const startRotation = rotation;
    const targetRotation = startRotation + (360 * spinCount) + randomDegree;
    
    setRotation(targetRotation);

    // Audio Sync Loop
    // We simulate the rotation in JS to trigger sounds when passing pegs
    const startTime = performance.now();
    const segmentSize = 360 / players.length;

    const tick = () => {
      const now = performance.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Calculate current virtual rotation based on easing
      const easedProgress = cubicBezier(progress);
      const currentRotation = startRotation + (targetRotation - startRotation) * easedProgress;

      // Check if we passed a segment boundary (peg)
      // We check if the integer division of segment size changed
      // Offset by -90 because the pointer is at the top
      const currentTickIndex = Math.floor((currentRotation) / segmentSize);
      
      if (currentTickIndex > lastTickRef.current) {
        // Only play if moving fast enough (don't click on the very last slow creep)
        if (progress < 0.98) { 
           playTick();
        }
        lastTickRef.current = currentTickIndex;
      }

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(tick);
      }
    };

    lastTickRef.current = Math.floor(startRotation / segmentSize);
    cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = requestAnimationFrame(tick);

  }, [rotation, isSpinning, players.length]);

  const handleSpinEnd = () => {
    setIsSpinning(false);
    cancelAnimationFrame(animationFrameRef.current);
    
    const actualRotation = rotation % 360;
    const sliceAngle = 360 / players.length;
    
    const winningIndex = Math.floor((players.length - (actualRotation / sliceAngle) % players.length)) % players.length;
    
    const winPlayer = players[winningIndex];
    setWinner(winPlayer);
    setHistory(prev => [winPlayer, ...prev].slice(0, 5));
    
    playWin();
  };

  const handleModalClose = () => {
    setWinner(null);
    if (eliminationMode && winner) {
      handleRemovePlayer(winner.id);
    }
  };

  return (
    <div className="min-h-screen lg:h-screen bg-[#020617] text-slate-200 flex flex-col lg:flex-row lg:overflow-hidden font-sans selection:bg-red-500 selection:text-white relative">
      <div className="scanlines"></div>
      <div className="fixed inset-0 z-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>
      
      {/* LEFT PANEL */}
      <div className="relative w-full h-auto lg:h-full lg:flex-1 bg-gradient-to-br from-slate-950 via-[#050b1d] to-slate-950 flex flex-col items-center justify-start lg:justify-center p-0 lg:p-0 order-1 lg:order-1 shrink-0">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-fuchsia-900/10 rounded-full blur-[100px] pointer-events-none fixed lg:absolute"></div>
         
         <div className="lg:hidden w-full text-center pt-10 pb-2 z-20 relative">
            <h1 className="text-4xl font-display font-black text-white tracking-tight neon-text italic">ASMODEUS</h1>
         </div>

         <div ref={wheelContainerRef} className="w-full flex items-center justify-center relative z-10 py-8 lg:py-0 lg:h-full min-h-[350px]">
            <Wheel 
              players={players} 
              rotation={rotation} 
              radius={Math.max(100, wheelSize)} 
              onSpinEnd={handleSpinEnd}
              isSpinning={isSpinning}
            />
         </div>
         
         <div className="absolute bottom-2 left-4 text-[10px] font-mono text-slate-700 hidden lg:block">
            SYS.VER.2.1.0 // AUDIO_ENABLED
         </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-full h-auto lg:h-full lg:w-[450px] bg-slate-900/95 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col z-20 shadow-2xl order-2 lg:order-2 backdrop-blur-md relative">
        
        <div className="p-3 lg:p-6 border-b border-slate-800 bg-slate-950/50 hidden lg:block">
           <div className="flex items-center gap-3 mb-2">
             <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_red]"></div>
             <h2 className="text-xs font-mono text-red-500 tracking-[0.3em]">COMMAND CENTER</h2>
           </div>
           <h1 className="text-4xl font-display font-black text-white tracking-tight neon-text italic">
             ASMODEUS
           </h1>
        </div>

        <div className="flex-none lg:flex-1 lg:overflow-y-auto custom-scrollbar flex flex-col p-4 lg:p-6 gap-4">
           
           <div className="w-full">
             <Controls 
               players={players} 
               onAddPlayer={handleAddPlayer} 
               onRemovePlayer={handleRemovePlayer}
               onReset={handleReset}
               isSpinning={isSpinning}
               eliminationMode={eliminationMode}
               setEliminationMode={setEliminationMode}
             />
           </div>

           {history.length > 0 && (
             <div className="hidden lg:block bg-slate-950/50 rounded-lg p-4 border border-slate-800 shrink-0">
               <div className="flex items-center gap-2 mb-3 text-slate-400">
                 <History className="w-4 h-4" />
                 <span className="text-xs font-bold uppercase tracking-wider">Recent Victories</span>
               </div>
               <div className="space-y-2">
                 {history.map((h, i) => (
                   <div key={`${h.id}-${i}`} className="flex items-center justify-between text-sm">
                      <span className="text-slate-300 font-display">{h.name}</span>
                      {i === 0 && <Trophy className="w-3 h-3 text-yellow-500" />}
                   </div>
                 ))}
               </div>
             </div>
           )}
        </div>

        <div className="p-4 lg:p-6 bg-slate-950 border-t border-slate-800 shrink-0 pb-safe-area sticky bottom-0 lg:relative z-30">
          <button
            onClick={handleSpin}
            disabled={isSpinning || players.length < 2}
            className={`w-full relative overflow-hidden group py-4 lg:py-5 rounded-md font-display font-black text-lg lg:text-xl tracking-widest transition-all ${
              isSpinning || players.length < 2
                ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'
                : 'bg-red-600 text-white hover:bg-red-500 shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:shadow-[0_0_30px_rgba(220,38,38,0.6)] border border-red-500'
            }`}
          >
             <div className="flex items-center justify-center gap-3 relative z-10">
               {isSpinning ? (
                 <>
                   <Zap className="w-5 h-5 animate-spin" /> <span className="text-sm lg:text-xl">PROCESSING</span>
                 </>
               ) : (
                 <>
                   <Play fill="currentColor" className="w-5 h-5" /> <span className="text-sm lg:text-xl">INITIATE SPIN (SPACE)</span>
                 </>
               )}
             </div>
             {!isSpinning && players.length >= 2 && (
               <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
             )}
          </button>
          
          <div className="mt-2 lg:mt-3 flex justify-between text-[10px] text-slate-600 font-mono uppercase">
             <span>Status: {isSpinning ? 'ACTIVE' : 'READY'}</span>
             <span>{players.length} SOULS LOADED</span>
          </div>
        </div>

      </div>

      <WinnerModal winner={winner} onClose={handleModalClose} />
    </div>
  );
};

export default App;