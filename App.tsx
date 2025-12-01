import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Player } from './types';
import { INITIAL_PLAYERS, WHEEL_COLORS, PRESET_PLAYERS } from './constants';
import Wheel from './components/Wheel';
import Controls from './components/Controls';
import { Suspense, lazy } from 'react';
import WinRipple from './components/WinRipple';
import { Play, Zap, History, Trophy } from 'lucide-react';
import { ensureAudio, playTick, playWin, playSpinStart } from './utils/audio';

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

const PLAYERS_STORAGE_KEY = 'asmodeus_players';
const HISTORY_STORAGE_KEY = 'asmodeus_history';
const CONFETTI_DURATION = 2200;
const SOUND_STORAGE_KEY = 'asmodeus_sound';
const MODE_STORAGE_KEY = 'asmodeus_elimination';
const DEMO_STORAGE_KEY = 'asmodeus_demo';
const STREAMER_STORAGE_KEY = 'asmodeus_streamer';

const normalizePlayers = (raw: any[], colorOffset = 0): Player[] => {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((item) => item && typeof item.name === 'string')
    .map((item, index) => ({
      id: typeof item.id === 'string' ? item.id : crypto.randomUUID(),
      name: item.name,
      color:
        typeof item.color === 'string'
          ? item.color
          : WHEEL_COLORS[(index + colorOffset) % WHEEL_COLORS.length],
    }));
};

const App: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(PLAYERS_STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const normalized = normalizePlayers(parsed);
          if (normalized.length) {
            return normalized;
          }
        } catch (err) {
          console.warn('Could not read players from localStorage', err);
        }
      }
    }

    return INITIAL_PLAYERS.map((name, i) => ({
      id: crypto.randomUUID(),
      name,
      color: WHEEL_COLORS[i % WHEEL_COLORS.length],
    }));
  });

  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<Player | null>(null);
  const [history, setHistory] = useState<Player[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return normalizePlayers(parsed).slice(0, 5);
        } catch (err) {
          console.warn('Could not read history from localStorage', err);
        }
      }
    }
    return [];
  });
const [eliminationMode, setEliminationMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(MODE_STORAGE_KEY);
      if (saved) return saved === 'true';
    }
    return false;
  });
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(SOUND_STORAGE_KEY);
      if (saved) return saved === 'true';
    }
    return true;
  });
  const [demoMode, setDemoMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(DEMO_STORAGE_KEY);
      if (saved) return saved === 'true';
    }
    return false;
  });
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [sparkBurst, setSparkBurst] = useState(0);
  const [beamTrigger, setBeamTrigger] = useState(0);
  const [liveMessage, setLiveMessage] = useState('');
  const [rippleTrigger, setRippleTrigger] = useState(0);
  const [streamerMode, setStreamerMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STREAMER_STORAGE_KEY);
      if (saved) return saved === 'true';
    }
    return false;
  });
  const [countdown, setCountdown] = useState(10);
  const [isReady, setIsReady] = useState(false);
  
  // Audio state refs
  const lastTickRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  const beamTimeoutRef = useRef<number>(0);
  
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

  const handleSpin = useCallback(() => {
    if (isSpinning || players.length < 2) return;

    setWinner(null);
    setHighlightId(null);
    setIsSpinning(true);
    window.clearTimeout(beamTimeoutRef.current);
    
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

    if (soundEnabled) {
      ensureAudio();
      playSpinStart();
    }

    // Light beam near final turns
    beamTimeoutRef.current = window.setTimeout(() => {
      setBeamTrigger((prev) => prev + 1);
    }, duration * 0.7);

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
           if (soundEnabled) {
             playTick();
           }
           setSparkBurst((prev) => prev + 1);
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

  }, [rotation, isSpinning, players.length, soundEnabled]);

  // Keyboard support (Spacebar to spin)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
      if (e.code === 'Space' && !isSpinning && !winner && players.length >= 2) {
        // Prevent scrolling down
        e.preventDefault();
        handleSpin();
        return;
      }
      if (isInput) return;
      if (e.code === 'KeyS') {
        e.preventDefault();
        handleToggleSound();
        return;
      }
      if (e.code === 'KeyD') {
        e.preventDefault();
        setDemoMode((prev) => !prev);
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSpinning, winner, players, handleSpin]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(PLAYERS_STORAGE_KEY, JSON.stringify(players));
  }, [players]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    if (soundEnabled) {
      ensureAudio();
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem(SOUND_STORAGE_KEY, String(soundEnabled));
    }
  }, [soundEnabled]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(MODE_STORAGE_KEY, String(eliminationMode));
    }
  }, [eliminationMode]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(DEMO_STORAGE_KEY, String(demoMode));
    }
  }, [demoMode]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STREAMER_STORAGE_KEY, String(streamerMode));
    }
  }, [streamerMode]);

  // Demo mode auto-spin
  useEffect(() => {
    if (!demoMode) return;
    if (isSpinning) return;
    if (winner) return;
    if (players.length < 2) return;

    const delay = 8000 + Math.random() * 4000;
    const timer = window.setTimeout(() => {
      handleSpin();
    }, delay);

    return () => window.clearTimeout(timer);
  }, [demoMode, isSpinning, winner, players.length, handleSpin]);

  // Auto add players for demo
  useEffect(() => {
    if (!demoMode) return;
    if (players.length >= 2) return;
    setPlayers((prev) => {
      if (prev.length >= 2) return prev;
      const startIndex = prev.length;
      const additions = PRESET_PLAYERS.slice(0, 6 - startIndex).map((name, i) => ({
        id: crypto.randomUUID(),
        name,
        color: WHEEL_COLORS[(startIndex + i) % WHEEL_COLORS.length],
      }));
      return [...prev, ...additions];
    });
  }, [demoMode, players.length]);

  useEffect(() => {
    return () => {
      window.clearTimeout(beamTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/asmodeus/sw.js', { scope: '/asmodeus/' }).catch((err) => {
        console.warn('SW register failed', err);
      });
    }
  }, []);

  // Streamer mode countdown
  useEffect(() => {
    if (!streamerMode) return;
    if (isSpinning) return;
    const interval = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          handleSpin();
          return 10;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [streamerMode, isSpinning, handleSpin]);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsReady(true), 400);
    return () => window.clearTimeout(timer);
  }, []);

  const handleAddPlayer = (name: string, color: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const exists = players.some((p) => p.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      alert('Name already exists');
      setLiveMessage(`${trimmed} is already in the list`);
      return;
    }

    setPlayers((prev) => [...prev, { id: crypto.randomUUID(), name: trimmed, color }]);
    setLiveMessage(`Added player ${trimmed}`);
  };

  const handleRemovePlayer = (id: string) => {
    const removed = players.find((p) => p.id === id);
    setPlayers((prev) => prev.filter((p) => p.id !== id));
    if (removed) {
      setLiveMessage(`Removed player ${removed.name}`);
    }
  };

  const handleReorderPlayers = (from: number, to: number) => {
    setPlayers((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const handleAddPreset = () => {
    setPlayers((prev) => {
      const lower = new Set(prev.map((p) => p.name.toLowerCase()));
      const additions = PRESET_PLAYERS.filter((n) => !lower.has(n.toLowerCase()));
      if (!additions.length) return prev;
      const startIndex = prev.length;
      const newPlayers = additions.map((name, i) => ({
        id: crypto.randomUUID(),
        name,
        color: WHEEL_COLORS[(startIndex + i) % WHEEL_COLORS.length],
      }));
      return [...prev, ...newPlayers];
    });
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
      setLiveMessage('Player list reset');
    }
  };

  const handleSpinEnd = () => {
    setIsSpinning(false);
    cancelAnimationFrame(animationFrameRef.current);
    
    const actualRotation = rotation % 360;
    const sliceAngle = 360 / players.length;
    
      const winningIndex = Math.floor((players.length - (actualRotation / sliceAngle) % players.length)) % players.length;
      
    const winPlayer = players[winningIndex];
    setWinner(winPlayer);
    setHighlightId(winPlayer.id);
    setHistory(prev => [winPlayer, ...prev].slice(0, 5));
    setLiveMessage(`${winPlayer.name} won`);
    setRippleTrigger((prev) => prev + 1);
      
      if (soundEnabled) {
        playWin();
      }

    setConfettiTrigger((prev) => prev + 1);
  };

  const handleModalClose = () => {
    setWinner(null);
    if (eliminationMode && winner) {
      handleRemovePlayer(winner.id);
    }
  };

  const handleToggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      if (!prev) {
        ensureAudio();
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen lg:h-screen bg-[#020617] text-slate-200 flex flex-col lg:flex-row lg:overflow-hidden font-sans selection:bg-red-500 selection:text-white relative">
      {!isReady && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-24 h-24 rounded-full border-4 border-fuchsia-500/40 border-t-transparent animate-spin"></div>
            <div className="text-sm font-mono text-slate-300">Initializing systems...</div>
          </div>
        </div>
      )}
      <div className="floating-stripes"></div>
      <div className="noise-overlay"></div>
      <div className="grid-overlay"></div>
      <div className="scanlines"></div>
      <div className="fixed inset-0 z-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>
      
      {/* Ambient layers */}
      <div className="floating-particles" aria-hidden>
        {Array.from({ length: 32 }).map((_, i) => (
          <span
            key={i}
            className={`dot ${i % 3 === 0 ? 'alt' : ''}`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 6}s`,
            }}
          />
        ))}
      </div>

      {/* LEFT PANEL */}
      <div
        className="relative w-full h-auto lg:h-full lg:flex-1 bg-gradient-to-br from-slate-950 via-[#050b1d] to-slate-950 flex flex-col items-center justify-start lg:justify-center p-0 lg:p-0 order-1 lg:order-1 shrink-0"
      >
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
              highlightId={highlightId}
              sparkBurst={sparkBurst}
              beamTrigger={beamTrigger}
            />
         </div>
         
         <div className="absolute bottom-2 left-4 text-[10px] font-mono text-slate-700 hidden lg:block">
            SYS.VER.2.1.0 // AUDIO_ENABLED
         </div>
      </div>

      {/* RIGHT PANEL */}
      <div
        className="w-full h-auto lg:h-full lg:w-[450px] glass-panel bg-slate-900/80 border-t lg:border-t-0 lg:border-l border-slate-800/70 flex flex-col z-20 shadow-2xl order-2 lg:order-2 relative overflow-hidden"
      >
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>

        <div className="p-3 lg:p-6 border-b border-slate-800/70 bg-slate-950/40 hidden lg:block">
           <div className="flex items-center gap-3 mb-2">
             <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_red]"></div>
             <h2 className="text-xs font-mono text-red-500 tracking-[0.3em]">COMMAND CENTER</h2>
           </div>
           <h1 className="text-4xl font-display font-black text-white tracking-tight neon-text italic">
             ASMODEUS
           </h1>
           <div className="flex flex-wrap items-center gap-2 mt-3">
             <span className="chip chip-red">Game Mode</span>
             <span className="chip chip-cyan">Elimination {eliminationMode ? 'On' : 'Off'}</span>
             <span className="chip chip-amber">Sound {soundEnabled ? 'On' : 'Off'}</span>
           </div>
           <div className="hud-line mt-4"></div>
        </div>

        <div className="flex-none lg:flex-1 lg:overflow-y-auto custom-scrollbar flex flex-col p-4 lg:p-6 gap-4">
           
           <div className="w-full glass-panel rounded-xl border border-slate-800/60 shadow-xl relative overflow-hidden p-4 lg:p-5">
             <div className="hud-line absolute top-0 left-0 right-0" aria-hidden></div>
             <Controls 
               players={players} 
               onAddPlayer={handleAddPlayer} 
               onRemovePlayer={handleRemovePlayer}
               onReorderPlayers={handleReorderPlayers}
               onAddPreset={handleAddPreset}
               onReset={handleReset}
               isSpinning={isSpinning}
               eliminationMode={eliminationMode}
               setEliminationMode={setEliminationMode}
               highlightId={highlightId}
             />
             
             <div className="grid grid-cols-2 gap-2 mt-4 text-[11px] font-mono text-slate-400 uppercase tracking-tight">
               <div className="bg-slate-900/70 border border-slate-800/60 rounded-lg px-3 py-2 flex items-center justify-between">
                 <span>Players</span>
                 <span className="text-cyan-400 font-bold">{players.length}</span>
               </div>
               <div className="bg-slate-900/70 border border-slate-800/60 rounded-lg px-3 py-2 flex items-center justify-between">
                 <span>Mode</span>
                 <span className="text-amber-300 font-bold">{eliminationMode ? 'Eliminate' : 'Classic'}</span>
               </div>
               <div className="bg-slate-900/70 border border-slate-800/60 rounded-lg px-3 py-2 flex items-center justify-between">
                 <span>Sound</span>
                 <span className="text-emerald-300 font-bold">{soundEnabled ? 'Enabled' : 'Muted'}</span>
               </div>
               <div className="bg-slate-900/70 border border-slate-800/60 rounded-lg px-3 py-2 flex items-center justify-between">
                 <span>History</span>
                 <span className="text-fuchsia-300 font-bold">{history.length}</span>
               </div>
             </div>
           </div>

           {history.length > 0 && (
             <div className="hidden lg:block glass-panel rounded-xl p-4 border border-slate-800/70 shrink-0 shadow-xl relative overflow-hidden">
               <div className="absolute inset-x-0 top-0 h-1 hud-line" aria-hidden></div>
               <div className="flex items-center gap-2 mb-3 text-slate-400">
                 <History className="w-4 h-4" />
                 <span className="text-xs font-bold uppercase tracking-wider">Recent Victories</span>
               </div>
               <div className="space-y-2">
                 {history.map((h, i) => (
                   <div
                     key={`${h.id}-${i}`}
                     className={`flex items-center justify-between text-sm px-2 py-1 rounded ${
                       highlightId === h.id && i === 0 ? 'bg-fuchsia-500/10 border border-fuchsia-400/40 shadow-[0_0_12px_rgba(236,72,153,0.3)]' : ''
                     }`}
                   >
                      <span className="text-slate-300 font-display">{h.name}</span>
                      {i === 0 && <Trophy className="w-3 h-3 text-yellow-500" />}
                   </div>
                 ))}
               </div>
             </div>
           )}
        </div>

        <div className="p-4 lg:p-6 bg-slate-950/90 border-t border-slate-800 shrink-0 pb-safe-area sticky bottom-0 lg:relative z-30">
          <div className="accent-bar mb-4" aria-hidden></div>
          <button
            onClick={handleSpin}
            disabled={isSpinning || players.length < 2}
            aria-label={isSpinning ? 'Wheel is spinning' : `Spin the wheel. Players: ${players.length}`}
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
          
          <div className="mt-2 lg:mt-3 flex justify-between items-center text-[10px] text-slate-600 font-mono uppercase gap-3">
             <span>Status: {isSpinning ? 'ACTIVE' : 'READY'}</span>
             <div className="flex items-center gap-2">
               <button
                 onClick={handleToggleSound}
                 className={`px-2 py-1 rounded border transition-colors ${
                   soundEnabled 
                     ? 'border-cyan-500 text-cyan-400 bg-cyan-500/10' 
                     : 'border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-500'
                 }`}
                 title="Toggle sound"
               >
                 Sound: {soundEnabled ? 'On' : 'Off'}
               </button>
               <button
                 onClick={() => setDemoMode((prev) => !prev)}
                 className={`px-2 py-1 rounded border transition-colors ${
                   demoMode
                     ? 'border-amber-400 text-amber-300 bg-amber-400/10'
                     : 'border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-500'
                 }`}
                 title="Demo mode: auto-spin"
               >
                 Demo: {demoMode ? 'On' : 'Off'}
               </button>
               <button
                 onClick={() => setStreamerMode((prev) => !prev)}
                 className={`px-2 py-1 rounded border transition-colors ${
                   streamerMode
                     ? 'border-green-400 text-green-300 bg-green-400/10'
                     : 'border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-500'
                 }`}
                 title="Streamer mode: fullscreen + auto-spin timer"
               >
                 Streamer: {streamerMode ? 'On' : 'Off'}
               </button>
               <span>{players.length} SOULS LOADED</span>
             </div>
          </div>
          <div className="mt-1 text-[10px] text-slate-500 font-mono uppercase">Space — Spin, S — Sound, D — Demo</div>
          {streamerMode && !isSpinning && (
            <div className="mt-3 text-xs text-emerald-300 font-mono flex items-center justify-between">
              <span>Auto-spin in {countdown}s</span>
              <button
                onClick={handleSpin}
                className="px-3 py-2 rounded-md bg-emerald-600 text-white font-semibold tracking-wide text-xs hover:bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.35)]"
              >
                Next spin now
              </button>
            </div>
          )}
        </div>

      </div>

      <WinnerModal winner={winner} onClose={handleModalClose} />
      <WinRipple trigger={rippleTrigger} color={winner?.color || '#ef4444'} />
      <Confetti trigger={confettiTrigger} duration={CONFETTI_DURATION} />
      <div className="sr-only" aria-live="polite">
        {(winner ? `${winner.name} won` : isSpinning ? 'Wheel is spinning' : 'Ready') + '. ' + (liveMessage || '')}
      </div>
    </div>
  );
};

export default App;
