import React, { useState, useEffect } from 'react';
import { Player } from '../types';
import { X, Crown } from 'lucide-react';

interface WinnerModalProps {
  winner: Player | null;
  onClose: () => void;
}

const VICTORY_MESSAGES = [
  "Fate has chosen you!",
  "The stars align in your favor!",
  "A glorious victory!",
  "Asmodeus smiles upon you.",
  "Destiny has spoken.",
  "Luck is your ally tonight.",
  "The Abyss gazes back... and winks.",
  "Your soul shines the brightest!",
  "Fortune favors the bold.",
  "The wheel stops for you!"
];

const WinnerModal: React.FC<WinnerModalProps> = ({ winner, onClose }) => {
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (winner) {
      // Pick a random message each time a winner is shown
      const randomMsg = VICTORY_MESSAGES[Math.floor(Math.random() * VICTORY_MESSAGES.length)];
      setMessage(randomMsg);
    }
  }, [winner]);

  if (!winner) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-fuchsia-500/50 rounded-2xl shadow-[0_0_50px_rgba(192,38,211,0.3)] max-w-sm w-full p-8 relative animate-scale-in overflow-hidden">
        
        {/* Background glow effect */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-fuchsia-500/20 rounded-full blur-3xl"></div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors z-10"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center relative z-10">
          <div className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center text-4xl font-display font-bold border-4 shadow-[0_0_20px_rgba(0,0,0,0.5)]"
               style={{ backgroundColor: winner.color, borderColor: '#0f172a', color: '#0f172a' }}>
            {winner.name.charAt(0).toUpperCase()}
          </div>
          
          <h2 className="text-cyan-400 text-xs uppercase tracking-[0.2em] font-bold mb-2">The Chosen One</h2>
          <h1 className="text-4xl font-display font-black text-white mb-8 neon-text">
            {winner.name}
          </h1>

          <div className="space-y-6">
             <div className="bg-slate-950/80 p-5 rounded-xl border border-fuchsia-500/30 shadow-inner">
               <p className="text-xs text-fuchsia-400 mb-2 flex items-center justify-center gap-1 uppercase tracking-wider font-bold">
                 <Crown className="w-3 h-3" /> Congratulations
               </p>
               <p className="text-xl text-white font-medium font-display leading-relaxed">"{message}"</p>
             </div>

            <button
              onClick={onClose}
              className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 rounded-xl font-semibold text-slate-300 transition-colors uppercase tracking-wide text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WinnerModal;