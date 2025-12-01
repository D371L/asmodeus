import React, { useState } from 'react';
import { Player } from '../types';
import { Plus, Trash2, Users, Skull, RotateCcw } from 'lucide-react';
import { WHEEL_COLORS } from '../constants';

interface ControlsProps {
  players: Player[];
  onAddPlayer: (name: string, color: string) => void;
  onRemovePlayer: (id: string) => void;
  onReorderPlayers: (from: number, to: number) => void;
  onAddPreset: () => void;
  onReset: () => void;
  isSpinning: boolean;
  eliminationMode: boolean;
  setEliminationMode: (enabled: boolean) => void;
  highlightId?: string | null;
}

const Controls: React.FC<ControlsProps> = ({ 
  players, 
  onAddPlayer, 
  onRemovePlayer, 
  onReorderPlayers,
  onAddPreset,
  onReset,
  isSpinning,
  eliminationMode,
  setEliminationMode,
  highlightId
}) => {
  const [newName, setNewName] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const handleAdd = () => {
    if (!newName.trim()) return;
    const color = WHEEL_COLORS[players.length % WHEEL_COLORS.length];
    onAddPlayer(newName.trim(), color);
    setNewName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    onReorderPlayers(dragIndex, index);
    setDragIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
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
              className="p-1 rounded border border-slate-700 text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-all shadow-[0_0_0_1px_rgba(255,255,255,0.04)] hover:shadow-[0_0_12px_rgba(148,163,184,0.25)] active:translate-y-[1px]"
              aria-label="Сбросить список"
              title="Reset List"
            >
              <RotateCcw className="w-3 h-3" />
            </button>

            {/* Preset Button */}
            <button
              onClick={onAddPreset}
              disabled={isSpinning}
              className="px-2 py-1 rounded border border-slate-700 text-slate-400 hover:text-cyan-300 hover:border-cyan-500 transition-all shadow-[0_0_0_1px_rgba(255,255,255,0.04)] hover:shadow-[0_0_12px_rgba(34,211,238,0.2)] active:translate-y-[1px] text-[11px] uppercase tracking-tight"
              aria-label="Добавить пресет имён"
              title="Добавить пресет имён"
            >
              Пресет
            </button>

            {/* Toggle Switch for Elimination Mode */}
            <button 
              onClick={() => setEliminationMode(!eliminationMode)}
              disabled={isSpinning}
              className={`flex items-center gap-2 px-2 py-1 rounded border transition-all ${
                 eliminationMode 
                 ? 'bg-red-900/40 border-red-500 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.25)]' 
                 : 'bg-slate-900 border-slate-700 text-slate-500 hover:text-slate-300 hover:shadow-[0_0_12px_rgba(255,255,255,0.08)]'
              }`}
              aria-pressed={eliminationMode}
              aria-label="Режим элиминации"
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
          className="flex-1 bg-slate-950 border border-slate-700 text-white rounded px-3 py-3 lg:py-2 text-base lg:text-sm focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/50 transition-all placeholder:text-slate-700 disabled:opacity-50 font-mono shadow-[0_0_0_1px_rgba(255,255,255,0.04),inset_0_0_10px_rgba(0,0,0,0.6)]"
        />
        <button
          onClick={handleAdd}
          disabled={!newName.trim() || isSpinning}
          className="bg-slate-800 hover:bg-cyan-900/60 hover:text-cyan-400 border border-slate-700 text-slate-400 p-3 lg:p-2 rounded transition-all disabled:opacity-30 disabled:hover:bg-slate-800 disabled:cursor-not-allowed aspect-square flex items-center justify-center shadow-[0_0_0_1px_rgba(255,255,255,0.05)] hover:shadow-[0_0_15px_rgba(34,211,238,0.25)] active:translate-y-[1px]"
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
        {players.map((player, idx) => (
          <div
            key={player.id}
            className={`flex items-center justify-between bg-slate-800/20 p-3 lg:p-2 rounded border-l-2 transition-all hover:bg-slate-800/50 group touch-manipulation w-full ${
              highlightId === player.id ? 'ring-2 ring-fuchsia-400/60 shadow-[0_0_15px_rgba(236,72,153,0.35)]' : ''
            }`}
            style={{ borderLeftColor: player.color }}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDragEnd={handleDragEnd}
          >
            <span className="font-medium text-slate-300 truncate max-w-[200px] text-sm font-mono tracking-tight drop-shadow-[0_0_6px_rgba(255,255,255,0.08)]">{player.name}</span>
            <button
              onClick={() => onRemovePlayer(player.id)}
              disabled={isSpinning}
              className="text-slate-500 hover:text-red-500 disabled:opacity-30 transition-colors p-2 lg:p-1 lg:opacity-0 group-hover:opacity-100 focus:opacity-100 active:opacity-100"
              aria-label={`Удалить ${player.name}`}
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
