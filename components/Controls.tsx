import React, { useState } from 'react';
import { Player } from '../types';
import { Plus, Trash2, Users, Skull, RotateCcw } from 'lucide-react';
import { WHEEL_COLORS } from '../constants';

interface ControlsProps {
  players: Player[];
  onAddPlayer: (name: string, color: string) => void;
  onRemovePlayer: (id: string) => void;
  onReset: () => void;
  isSpinning: boolean;
  eliminationMode: boolean;
  setEliminationMode: (enabled: boolean) => void;
}

const Controls: React.FC<ControlsProps> = ({ 
  players, 
  onAddPlayer, 
  onRemovePlayer, 
  onReset,
  isSpinning,
  eliminationMode,
  setEliminationMode
}) => {
  const [newName, setNewName] = useState('');

  const handleAdd = () => {
    if (!newName.trim()) return;
    const color = WHEEL_COLORS[players.length % WHEEL_COLORS.length];
    onAddPlayer(newName.trim(), color);
    setNewName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
  };

  return (
    <div className="flex flex-col h-full lg:h-full">
      <div className="flex items-center justify-between mb-2 lg:mb-4 shrink-0">
        <div className="flex items-center gap-2 text-cyan-400">
          <Users className="w-4 h-4" />
          <h2 className="text-sm font-display font-bold tracking-wider uppercase">Challengers ({players.length})</h2>
        </div>
        
        <div className="flex items-center gap-2">
            {/* Reset Button */}
            <button
              onClick={onReset}
              disabled={isSpinning}
              className="p-1 rounded border border-slate-700 text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-all"
              title="Reset List"
            >
              <RotateCcw className="w-3 h-3" />
            </button>

            {/* Toggle Switch for Elimination Mode */}
            <button 
              onClick={() => setEliminationMode(!eliminationMode)}
              disabled={isSpinning}
              className={`flex items-center gap-2 px-2 py-1 rounded border transition-all ${
                 eliminationMode 
                 ? 'bg-red-900/30 border-red-500 text-red-400' 
                 : 'bg-slate-900 border-slate-700 text-slate-500 hover:text-slate-300'
              }`}
              title="Elimination Mode: Remove winner after spin"
            >
              <span className="text-[10px] font-mono font-bold uppercase hidden lg:inline">ELIMINATION</span>
              <Skull className={`w-3 h-3 ${eliminationMode ? 'animate-pulse' : ''}`} />
            </button>
        </div>
      </div>

      <div className="flex gap-2 mb-2 lg:mb-4 shrink-0">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSpinning}
          placeholder="Enter Soul Name..."
          className="flex-1 bg-slate-950 border border-slate-700 text-white rounded px-3 py-3 lg:py-2 text-base lg:text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all placeholder:text-slate-700 disabled:opacity-50 font-mono shadow-inner"
        />
        <button
          onClick={handleAdd}
          disabled={!newName.trim() || isSpinning}
          className="bg-slate-800 hover:bg-cyan-900/50 hover:text-cyan-400 border border-slate-700 text-slate-400 p-3 lg:p-2 rounded transition-all disabled:opacity-30 disabled:hover:bg-slate-800 disabled:cursor-not-allowed aspect-square flex items-center justify-center"
        >
          <Plus className="w-6 h-6 lg:w-5 lg:h-5" />
        </button>
      </div>

      {/* List Container */}
      <div className="flex-none lg:flex-1 lg:overflow-y-auto space-y-1 lg:space-y-2 pr-0 lg:pr-1 custom-scrollbar min-h-0 w-full">
        {players.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center border border-dashed border-slate-800 rounded bg-slate-900/30 text-slate-600 gap-2 min-h-[100px] py-8 lg:py-0">
            <Users className="w-6 h-6 opacity-20" />
            <p className="text-xs font-mono">AWAITING INPUT</p>
          </div>
        )}
        {players.map((player) => (
          <div
            key={player.id}
            className="flex items-center justify-between bg-slate-800/20 p-3 lg:p-2 rounded border-l-2 transition-all hover:bg-slate-800/50 group touch-manipulation w-full"
            style={{ borderLeftColor: player.color }}
          >
            <span className="font-medium text-slate-300 truncate max-w-[200px] text-sm font-mono tracking-tight">{player.name}</span>
            <button
              onClick={() => onRemovePlayer(player.id)}
              disabled={isSpinning}
              className="text-slate-500 hover:text-red-500 disabled:opacity-30 transition-colors p-2 lg:p-1 lg:opacity-0 group-hover:opacity-100 focus:opacity-100 active:opacity-100"
            >
              <Trash2 className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Controls;