import { useEffect, useState } from 'react';

interface ParallaxState {
  rotateX: number;
  rotateY: number;
  translateX: number;
  translateY: number;
}

export const useParallax = (maxTilt = 4, maxShift = 10) => {
  const [state, setState] = useState<ParallaxState>({
    rotateX: 0,
    rotateY: 0,
    translateX: 0,
    translateY: 0,
  });

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 2;
      const y = (e.clientY / innerHeight - 0.5) * 2;
      setState({
        rotateX: y * maxTilt,
        rotateY: -x * maxTilt,
        translateX: x * maxShift,
        translateY: y * maxShift,
      });
    };

    const handleDevice = (e: DeviceOrientationEvent) => {
      const beta = e.beta ?? 0; // x-axis
      const gamma = e.gamma ?? 0; // y-axis
      setState({
        rotateX: Math.max(-maxTilt, Math.min(maxTilt, beta / 10)),
        rotateY: Math.max(-maxTilt, Math.min(maxTilt, gamma / 10)),
        translateX: Math.max(-maxShift, Math.min(maxShift, gamma / 5)),
        translateY: Math.max(-maxShift, Math.min(maxShift, beta / 5)),
      });
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('deviceorientation', handleDevice);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('deviceorientation', handleDevice);
    };
  }, [maxTilt, maxShift]);

  return state;
};
