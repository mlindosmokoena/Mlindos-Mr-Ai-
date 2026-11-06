import React from 'react';
import { AssistantState } from '../types/assistant';

interface AudioWaveformProps {
  state: AssistantState;
  height?: number;
  audioLevel?: number;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({ state, height = 36, audioLevel = 0 }) => {
  const bars = [
    { base: 0.3, speed: '0.4s', delay: '0s' },
    { base: 0.7, speed: '0.5s', delay: '0.1s' },
    { base: 0.9, speed: '0.35s', delay: '0.2s' },
    { base: 0.5, speed: '0.6s', delay: '0.05s' },
    { base: 1.0, speed: '0.45s', delay: '0.15s' },
    { base: 0.6, speed: '0.38s', delay: '0.25s' },
    { base: 0.85, speed: '0.52s', delay: '0.12s' },
    { base: 0.4, speed: '0.48s', delay: '0.08s' },
    { base: 0.75, speed: '0.42s', delay: '0.18s' },
    { base: 0.35, speed: '0.55s', delay: '0.22s' },
  ];

  const isActive = state === 'listening' || state === 'speaking';

  return (
    <div
      className="flex items-center justify-center gap-1.5 px-4 py-1"
      style={{ height: `${height}px` }}
      aria-hidden="true"
    >
      {bars.map((bar, idx) => (
        <span
          key={idx}
          className={`w-1 rounded-full transition-all duration-300 ${
            state === 'listening'
              ? 'bg-gradient-to-t from-cyan-500 to-emerald-400'
              : state === 'speaking'
              ? 'bg-gradient-to-t from-purple-500 to-pink-400'
              : state === 'thinking'
              ? 'bg-gradient-to-t from-pink-500 to-indigo-500'
              : 'bg-slate-700/60'
          }`}
          style={{
            height:
              state === 'listening'
                ? `${Math.max(15, Math.min(100, bar.base * 35 + audioLevel * 110))}%`
                : isActive
                ? `${Math.max(15, bar.base * 100)}%`
                : '15%',
            animationName: isActive && (!audioLevel || state !== 'listening') ? 'wavePulse' : 'none',
            animationDuration: bar.speed,
            animationTimingFunction: 'ease-in-out',
            animationIterationCount: 'infinite',
            animationDirection: 'alternate',
            animationDelay: bar.delay,
          }}
        />
      ))}
      <style>{`
        @keyframes wavePulse {
          0% { height: 15%; opacity: 0.5; }
          100% { height: 95%; opacity: 1; }
        }
      `}</style>
    </div>
  );
};
