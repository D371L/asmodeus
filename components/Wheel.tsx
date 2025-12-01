
import React, { useMemo } from 'react';
import { pie, arc, PieArcDatum } from 'd3-shape';
import { Player } from '../types';

interface WheelProps {
  players: Player[];
  rotation: number;
  radius: number;
  onSpinEnd?: () => void;
  isSpinning: boolean;
  highlightId?: string | null;
  sparkBurst?: number;
  beamTrigger?: number;
}

const Wheel: React.FC<WheelProps> = ({ players, rotation, radius, onSpinEnd, isSpinning, highlightId, sparkBurst = 0, beamTrigger = 0 }) => {
  const shadeColor = (hex: string, percent: number) => {
    const parsed = hex.replace('#', '');
    const num = parseInt(parsed, 16);
    if (Number.isNaN(num)) return hex;
    const amt = Math.round(2.55 * percent);
    const r = Math.min(255, Math.max(0, (num >> 16) + amt));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
    const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
    return `#${(0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  };

  const gradients = useMemo(() => {
    return players.map((p, idx) => {
      const base = p.color;
      const highlight = shadeColor(base, 28);
      const shadow = shadeColor(base, -20);
      const accent = shadeColor(base, 10);
      return {
        id: `grad-${p.id}`,
        highlight,
        shadow,
        accent,
        angle: (idx * 27) % 360,
      };
    });
  }, [players]);

  // Detect mobile layout to adjust sizes conditionally
  // Using < 1024px to match the 'lg' breakpoint used in App.tsx
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  const arcs = useMemo(() => {
    const pieGen = pie<Player>()
      .value(1)
      .sort(null);

    const arcGenerator = arc<PieArcDatum<Player>>()
      .innerRadius(30)
      .outerRadius(radius);
    
    // Create a specific generator for text placement
    // Mobile: 0.62 (moved inward away from edge)
    // Desktop: 0.76 (closer to edge)
    const textOffsetFactor = isMobile ? 0.62 : 0.76;

    const labelArcGenerator = arc<PieArcDatum<Player>>()
      .innerRadius(radius * textOffsetFactor)
      .outerRadius(radius * textOffsetFactor);
    
    // Generator for the pegs on the rim
    const pegArcGenerator = arc<PieArcDatum<Player>>()
      .innerRadius(radius - 8)
      .outerRadius(radius - 8);

    const data = pieGen(players);

    return data.map((d, i) => {
      return {
        path: arcGenerator(d),
        centroid: labelArcGenerator.centroid(d),
        pegCentroid: pegArcGenerator.centroid(d),
        data: d.data,
        startAngle: d.startAngle,
        endAngle: d.endAngle,
        index: i
      };
    });
  }, [players, radius, isMobile]);
  const winnerArc = highlightId ? arcs.find((a) => a.data.id === highlightId) : null;

  const handleTransitionEnd = (e: React.TransitionEvent<SVGSVGElement>) => {
    if (e.target !== e.currentTarget || e.propertyName !== 'transform') {
      return;
    }
    onSpinEnd?.();
  };

  // Dynamic sizing for the pointer
  let pointerScale = Math.min(1, radius / 150);
  
  // On mobile, reduce the pointer size significantly (approx 3x smaller than base calculation)
  if (isMobile) {
    pointerScale = pointerScale * 0.35; 
  }

  const pointerWidth = 80 * pointerScale;
  const pointerHeight = 100 * pointerScale;
  
  // Font size calculation
  // Mobile: Smaller multiplier to fit names better in the inner radius
  const fontSize = isMobile 
    ? Math.max(9, radius * 0.05) 
    : Math.max(12, radius * 0.07);

  return (
    <div className="relative flex items-center justify-center">
      {/* Background Ambient Glow */}
      <div className="absolute inset-0 bg-fuchsia-900/10 blur-[60px] rounded-full z-0 animate-pulse pointer-events-none" style={{ width: radius * 2.2, height: radius * 2.2, left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}></div>

      {/* Subtle radial gradient backdrop */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: radius * 2.6,
          height: radius * 2.6,
          background: 'radial-gradient(circle at 30% 30%, rgba(244,63,94,0.35), transparent 55%), radial-gradient(circle at 70% 60%, rgba(14,165,233,0.18), transparent 60%)',
          filter: 'blur(30px)',
          opacity: 0.8,
        }}
      />

      {/* Outer mechanical rim with bolts */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0">
        <svg width={radius * 2.6} height={radius * 2.6} viewBox={`0 0 ${radius * 2.6} ${radius * 2.6}`}>
          <defs>
            <linearGradient id="rimMetal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1f2937" />
              <stop offset="50%" stopColor="#0b1222" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <radialGradient id="rimHighlight" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
              <stop offset="50%" stopColor="rgba(255,255,255,0.04)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
          </defs>
          <circle
            cx={radius * 1.3}
            cy={radius * 1.3}
            r={radius * 1.25}
            fill="url(#rimMetal)"
            stroke="#111827"
            strokeWidth={radius * 0.02}
            opacity="0.9"
            filter="drop-shadow(0 0 20px rgba(0,0,0,0.6))"
          />
          <circle
            cx={radius * 1.3}
            cy={radius * 1.3}
            r={radius * 1.1}
            fill="none"
            stroke="#475569"
            strokeWidth={radius * 0.01}
            strokeDasharray="6 10"
            opacity="0.6"
          />

          {/* Bolts */}
          {Array.from({ length: 24 }).map((_, i) => {
            const angle = (i / 24) * Math.PI * 2;
            const boltRadius = radius * 1.2;
            const x = radius * 1.3 + boltRadius * Math.cos(angle);
            const y = radius * 1.3 + boltRadius * Math.sin(angle);
            return (
              <g key={i} transform={`translate(${x}, ${y})`}>
                <circle r={radius * 0.02} fill="#0f172a" stroke="#1f2937" strokeWidth={radius * 0.004} />
                <line x1={-radius * 0.01} y1="0" x2={radius * 0.01} y2="0" stroke="#475569" strokeWidth={radius * 0.003} />
                <line x1="0" y1={-radius * 0.01} x2="0" y2={radius * 0.01} stroke="#475569" strokeWidth={radius * 0.003} />
              </g>
            );
          })}

          {/* Soft highlight */}
          <circle cx={radius * 1.3} cy={radius * 1.3} r={radius * 1.25} fill="url(#rimHighlight)" />
        </svg>
      </div>

      {/* NEW: Improved Cyber-Talon Pointer (Dynamically Scaled) */}
      <div 
        className="absolute top-0 left-1/2 z-40 pointer-events-none drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]"
        style={{ 
          transform: `translate(-50%, -${pointerHeight * 0.1}px)`,
          width: pointerWidth,
          height: pointerHeight
        }}
      >
         <div className={`origin-top w-full h-full ${isSpinning ? 'animate-rattle' : ''}`}>
          <svg width="100%" height="100%" viewBox="0 0 80 100" preserveAspectRatio="xMidYMid meet" fill="none">
             <defs>
               <linearGradient id="pointerMetal" x1="0" y1="0" x2="100%" y2="0">
                 <stop offset="0%" stopColor="#1e293b" />
                 <stop offset="50%" stopColor="#475569" />
                 <stop offset="100%" stopColor="#1e293b" />
               </linearGradient>
               <filter id="glow">
                  <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                  <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                  </feMerge>
               </filter>
             </defs>
             {/* Mechanical Housing */}
             <path d="M20 0 H60 L65 20 L55 35 H25 L15 20 L20 0Z" fill="url(#pointerMetal)" stroke="#0f172a" strokeWidth="2" />
             {/* Glowing Core */}
             <circle cx="40" cy="18" r="6" fill="#ef4444" className="animate-pulse" filter="url(#glow)" />
             {/* The Needle/Blade */}
             <path d="M25 35 L40 95 L55 35 Z" fill="#b91c1c" stroke="#7f1d1d" strokeWidth="1" />
             <path d="M40 35 L40 95" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" filter="url(#glow)" />
          </svg>
         </div>
      </div>

      {/* Pointer sparks */}
      {sparkBurst > 0 && (
        <div
          key={sparkBurst}
          className="absolute top-0 left-1/2 z-40 pointer-events-none"
          style={{ transform: 'translate(-50%, -8px)' }}
        >
          <div className="relative w-16 h-16">
            {Array.from({ length: 7 }).map((_, i) => (
              <span
                key={i}
                className="absolute bg-gradient-to-tr from-red-400 via-amber-200 to-cyan-200 rounded-full"
                style={{
                  width: 4 + Math.random() * 8,
                  height: 4 + Math.random() * 8,
                  left: `${40 + (Math.random() * 40 - 20)}%`,
                  top: `${40 + (Math.random() * 30 - 10)}%`,
                  filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.6))',
                  animation: 'spark-pop 0.35s ease-out forwards',
                  animationDelay: `${Math.random() * 0.08}s`,
                  transformOrigin: 'center',
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Decorative Outer Bezel / Chassis */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 pointer-events-none opacity-60">
        <svg width={radius * 2.4} height={radius * 2.4} viewBox={`0 0 ${radius * 2.4} ${radius * 2.4}`} className="animate-[spin_40s_linear_infinite]">
          <defs>
            <radialGradient id="rimPulse" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(236,72,153,0.5)" />
              <stop offset="70%" stopColor="rgba(236,72,153,0.1)" />
              <stop offset="100%" stopColor="rgba(236,72,153,0)" />
            </radialGradient>
          </defs>
          <circle cx={radius * 1.2} cy={radius * 1.2} r={radius * 1.15} fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="10 10" opacity="0.5" />
          <circle cx={radius * 1.2} cy={radius * 1.2} r={radius * 1.08} fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="4 4" opacity="0.3" />
          {isSpinning && (
            <circle
              cx={radius * 1.2}
              cy={radius * 1.2}
              r={radius * 1.05}
              fill="url(#rimPulse)"
              opacity="0.35"
              className="animate-ping"
            />
          )}
        </svg>
      </div>


      {/* The Wheel Container with Neon Rim */}
      <div className="relative z-10 rounded-full 
                      border-[4px] border-slate-700
                      shadow-[0_0_50px_rgba(236,72,153,0.3),inset_0_0_20px_#000000] 
                      bg-slate-950 overflow-hidden"
            style={{ width: radius * 2, height: radius * 2 }}>

        {/* Winner halo behind segments */}
        {winnerArc && (
          <svg
            className="absolute inset-0 pointer-events-none z-0"
            width="100%"
            height="100%"
            viewBox={`-${radius} -${radius} ${radius * 2} ${radius * 2}`}
          >
            <path
              d={
                arc<PieArcDatum<Player>>()
                  .innerRadius(radius - 12)
                  .outerRadius(radius + 22)(winnerArc) || undefined
              }
              fill="url(#haloGradient)"
              opacity="0.4"
              style={{ animation: 'win-ripple 1.3s ease-out' }}
            />
          </svg>
        )}

        {/* Beam sweep on final turns */}
        {beamTrigger > 0 && (
          <div
            key={beamTrigger}
            className="absolute left-1/2 top-0 w-[40%] h-full pointer-events-none z-30"
            style={{
              transform: 'translate(-50%, -4%)',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.35), rgba(255,255,255,0))',
              filter: 'blur(2px)',
              mixBlendMode: 'screen',
              animation: 'beam-sweep 0.8s ease-out forwards',
            }}
          />
        )}

        {/* Glassy reflection overlay */}
        <div
          className="absolute inset-0 pointer-events-none z-20"
          style={{
            background: 'radial-gradient(circle at 25% 20%, rgba(255,255,255,0.16), transparent 45%), linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0))',
            mixBlendMode: 'screen',
          }}
        />
        <svg
          width="100%"
          height="100%"
          viewBox={`-${radius} -${radius} ${radius * 2} ${radius * 2}`}
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: isSpinning ? 'transform 10s cubic-bezier(0.1, 0, 0.18, 1)' : 'none',
            filter: isSpinning ? 'blur(0.5px)' : 'none', 
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          <defs>
            <linearGradient id="metal-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
        </linearGradient>
         <filter id="text-shadow">
           <feDropShadow dx="1" dy="1" stdDeviation="1" floodColor="rgba(0,0,0,0.5)"/>
         </filter>
         <filter id="winner-glow">
           <feGaussianBlur stdDeviation="4" result="blur" />
           <feMerge>
             <feMergeNode in="blur" />
             <feMergeNode in="SourceGraphic" />
           </feMerge>
         </filter>
         <pattern id="metal-texture" width="6" height="6" patternUnits="userSpaceOnUse">
           <rect width="6" height="6" fill="rgba(255,255,255,0.04)" />
           <path d="M0 6 L6 0" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
         </pattern>
         <pattern id="carbon" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
           <rect width="8" height="8" fill="rgba(255,255,255,0.02)" />
           <path d="M0 0 L0 8" stroke="rgba(255,255,255,0.05)" strokeWidth="2" />
           <path d="M4 0 L4 8" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
         </pattern>
         <radialGradient id="haloGradient" cx="50%" cy="50%" r="60%">
           <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
           <stop offset="80%" stopColor="rgba(255,255,255,0)" />
         </radialGradient>
         {gradients.map((g) => (
           <linearGradient
             key={g.id}
             id={g.id}
             x1="0%"
             y1="0%"
             x2="100%"
             y2="100%"
             gradientTransform={`rotate(${g.angle})`}
           >
             <stop offset="0%" stopColor={g.highlight} />
             <stop offset="45%" stopColor={g.accent} />
             <stop offset="100%" stopColor={g.shadow} />
           </linearGradient>
         ))}
          </defs>
          <g>
            {players.length === 0 ? (
              // Empty State Placeholder
              <g>
                <circle r={radius} fill="url(#metal-gradient)" opacity="0.9" />
                <text
                  textAnchor="middle"
                  alignmentBaseline="middle"
                  fill="#ef4444"
                  fontSize={radius * 0.1}
                  fontFamily="Orbitron"
                  fontWeight="800"
                  y="-15"
                  className="tracking-widest drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]"
                >
                  NO SOULS
                </text>
                 <text
                  textAnchor="middle"
                  alignmentBaseline="middle"
                  fill="#94a3b8"
                  fontSize={radius * 0.05}
                  fontFamily="Orbitron"
                  y="15"
                  className="tracking-[0.3em]"
                >
                  FEED THE WHEEL
                </text>
              </g>
            ) : (
              // Active Wheel Arcs
              arcs.map((arc, i) => (
                <g key={arc.data.id}>
                  <path
                    d={arc.path || undefined}
                    fill={`url(#grad-${arc.data.id})`}
                    stroke="#020617" 
                    strokeWidth="3"
                    className="transition-all"
                    filter={highlightId === arc.data.id ? 'url(#winner-glow)' : undefined}
                  />
                  <path
                    d={arc.path || undefined}
                    fill={i % 2 === 0 ? 'url(#metal-texture)' : 'url(#carbon)'}
                    opacity="0.08"
                  />
                  {highlightId === arc.data.id && (
                    <path
                      d={arc.path || undefined}
                      fill="none"
                      stroke="rgba(255,255,255,0.9)"
                      strokeWidth="5"
                      opacity="0.8"
                      strokeLinejoin="round"
                    />
                  )}
                  
                  {/* Pegs/Pins on the rim */}
                  <circle 
                    cx={arc.pegCentroid[0]} 
                    cy={arc.pegCentroid[1]} 
                    r="3.5" 
                    fill="url(#metal-gradient)" 
                    stroke="#0f172a" 
                    strokeWidth="1.2"
                    className="shadow-sm"
                  />

                  {/* Text Container */}
                  <g
                    transform={`translate(${arc.centroid}) rotate(${
                      ((arc.startAngle + arc.endAngle) / 2 * 180) / Math.PI + 90
                    })`}
                  >
                    <text
                      textAnchor="middle"
                      alignmentBaseline="middle"
                      fill="#020617"
                      // Adjusted font size logic: smaller on mobile
                      fontSize={fontSize}
                      fontFamily="Orbitron"
                      fontWeight="900"
                      filter="url(#text-shadow)"
                      className="select-none uppercase tracking-wider"
                      style={{
                         // No rotation needed for the text itself as the Group is rotated tangentially
                      }}
                    >
                      {arc.data.name.length > 15 ? arc.data.name.substring(0, 14) + '..' : arc.data.name}
                    </text>
                  </g>
                </g>
              ))
            )}
          </g>
        </svg>
      </div>

       {/* Demonic Center Hub */}
       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none flex items-center justify-center">
          
          {/* Pulsing Red Aura */}
          <div className="absolute w-[140%] h-[140%] rounded-full bg-red-600 blur-2xl opacity-40 animate-pulse"></div>
          
          {/* Main Metal Disc */}
          <div 
             className="rounded-full bg-slate-950 border-[3px] border-slate-800 shadow-[0_0_30px_rgba(0,0,0,0.8)] flex items-center justify-center relative overflow-hidden"
             style={{ width: radius * 0.4, height: radius * 0.4, minWidth: '60px', minHeight: '60px' }}
          >
            
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#334155_0%,_#020617_100%)]"></div>
            
            {/* Spinning Runes Ring */}
            <div className="absolute inset-[2px] animate-[spin_15s_linear_infinite]">
               <svg viewBox="0 0 100 100" className="w-full h-full opacity-70">
                  <path id="curve" d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0" fill="none"/>
                  <text fill="#ef4444" fontSize="5.5" fontWeight="bold" letterSpacing="3.5" fontFamily="Orbitron">
                    <textPath href="#curve" startOffset="0">
                       • ASMODEUS • DOMINUS • INFERNUS •
                    </textPath>
                  </text>
               </svg>
            </div>

            {/* Inner Dark Circle */}
            <div className="absolute inset-[24%] rounded-full bg-black border border-red-900/60 shadow-inner"></div>
            
            {/* Perfectly Centered Pentagram/Star */}
            <div className="absolute inset-0 flex items-center justify-center animate-[spin_60s_linear_infinite_reverse]">
              <svg viewBox="0 0 100 100" className="w-[60%] h-[60%] drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]">
                 <defs>
                   <linearGradient id="starGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#fca5a5" />
                      <stop offset="100%" stopColor="#b91c1c" />
                   </linearGradient>
                 </defs>
                 {/* Mathematical 5-point star coordinates centered at 50,50 */}
                 <polygon 
                   points="50,15 61,38 85,38 66,54 73,79 50,65 27,79 34,54 15,38 39,38"
                   fill="none" 
                   stroke="url(#starGradient)" 
                   strokeWidth="3" 
                   strokeLinejoin="round"
                   transform="rotate(180 50 50)" 
                 />
                 <circle cx="50" cy="50" r="28" stroke="#7f1d1d" strokeWidth="1" fill="none" opacity="0.5" />
              </svg>
            </div>

            {/* The Eye/Core */}
            <div className="absolute w-4 h-4 bg-red-600 rounded-full shadow-[0_0_15px_#ef4444] animate-pulse flex items-center justify-center z-30">
               <div className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_white]"></div>
            </div>
          </div>
       </div>
    </div>
  );
};

export default Wheel;
