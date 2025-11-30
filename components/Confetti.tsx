import React, { useEffect, useMemo, useState } from 'react';

interface ConfettiProps {
  trigger: number;
  duration?: number;
}

const COLORS = ['#f43f5e', '#22d3ee', '#a78bfa', '#fbbf24', '#34d399', '#60a5fa'];

const Confetti: React.FC<ConfettiProps> = ({ trigger, duration = 2000 }) => {
  const [active, setActive] = useState(false);

  const pieces = useMemo(() => {
    const count = 120;
    return Array.from({ length: count }, (_, i) => {
      const left = Math.random() * 100;
      const delay = Math.random() * 0.35;
      const fall = 1.2 + Math.random() * 1.3;
      const x = (Math.random() * 2 - 1) * 25; // drift range
      const rotation = Math.random() * 360;
      const size = 6 + Math.random() * 10;
      const round = Math.random() > 0.7;

      return {
        id: `${trigger}-${i}`,
        left,
        delay,
        fall,
        x,
        rotation,
        size,
        round,
        color: COLORS[i % COLORS.length],
      };
    });
  }, [trigger]);

  useEffect(() => {
    if (trigger === 0) return;
    setActive(true);
    const timer = setTimeout(() => setActive(false), duration + 500);
    return () => clearTimeout(timer);
  }, [trigger, duration]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-40" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          style={{
            position: 'absolute',
            top: '-8%',
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size * 0.35}px`,
            backgroundColor: p.color,
            borderRadius: p.round ? '999px' : '2px',
            opacity: 0,
            transform: `translate3d(0, -10%, 0) rotate(${p.rotation}deg)`,
            animation: `confetti-fall ${p.fall}s ease-out ${p.delay}s forwards`,
            boxShadow: `0 0 10px ${p.color}33`,
            mixBlendMode: 'screen',
            // CSS variable for horizontal drift
            ['--x' as string]: `${p.x}vw`,
          }}
        />
      ))}
    </div>
  );
};

export default Confetti;
