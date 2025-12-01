import React, { useEffect, useState } from 'react';

interface WinRippleProps {
  trigger: number;
  color: string;
}

const WinRipple: React.FC<WinRippleProps> = ({ trigger, color }) => {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!trigger) return;
    setActive(true);
    const t = setTimeout(() => setActive(false), 900);
    return () => clearTimeout(t);
  }, [trigger]);

  if (!active) return null;

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-30">
      <div
        className="rounded-full"
        style={{
          width: '80%',
          height: '80%',
          border: `2px solid ${color}`,
          boxShadow: `0 0 25px ${color}55`,
          animation: 'win-ripple 0.9s ease-out forwards',
        }}
      />
    </div>
  );
};

export default WinRipple;
