import { useState, useEffect, useMemo } from 'react';

const COLORS = ['#22C55E', '#3B82F6', '#EAB308', '#8B5CF6', '#EF4444', '#06B6D4'];
const PARTICLE_COUNT = 25;

interface Particle {
  x: number;
  size: number;
  color: string;
  duration: number;
  delay: number;
  round: boolean;
}

export function ConfettiAnimation() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  const particles: Particle[] = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
        x: (i / PARTICLE_COUNT) * 100 + Math.random() * 4,
        size: 6 + Math.floor(Math.random() * 10),
        color: COLORS[i % COLORS.length]!,
        duration: 1.5 + Math.random() * 1.5,
        delay: i * 0.12,
        round: i % 2 === 0,
      })),
    [],
  );

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(-20px) rotate(0deg) scale(1); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg) scale(0.4); opacity: 0; }
        }
      `}</style>
      {particles.map((p, i) => (
        <div
          key={i}
          data-testid="confetti-particle"
          style={{
            position: 'fixed',
            left: `${p.x}%`,
            top: '-20px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            borderRadius: p.round ? '50%' : '2px',
            animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
            pointerEvents: 'none',
            zIndex: 10001,
          }}
        />
      ))}
    </>
  );
}
