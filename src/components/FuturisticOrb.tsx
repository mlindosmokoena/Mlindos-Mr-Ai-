import React, { useEffect, useRef } from 'react';
import { AssistantState } from '../types/assistant';

interface FuturisticOrbProps {
  state: AssistantState;
  onClick: () => void;
  interimTranscript?: string;
  audioLevel?: number;
}

export const FuturisticOrb: React.FC<FuturisticOrbProps> = ({
  state,
  onClick,
  interimTranscript,
  audioLevel = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let angle = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const baseRadius = 68;

      angle += state === 'thinking' ? 0.05 : state === 'speaking' ? 0.04 : 0.015;

      // Draw subtle orbital particle arcs
      ctx.save();
      ctx.translate(centerX, centerY);

      // Outer rings based on state
      const ringCount = state === 'listening' ? 4 : state === 'speaking' ? 3 : 2;
      const boost = state === 'listening' ? 1 + audioLevel * 1.8 : 1;
      for (let i = 0; i < ringCount; i++) {
        ctx.beginPath();
        const rOffset = Math.sin(angle * 2 + i * 1.5) * (state === 'listening' ? 14 * boost : 6);
        const ringRadius = baseRadius + 14 + i * 14 * boost + rOffset;
        ctx.arc(0, 0, Math.max(10, ringRadius), 0, Math.PI * 2);

        if (state === 'listening') {
          const alpha = Math.min(0.9, 0.45 + audioLevel * 0.5 - i * 0.08);
          ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
          ctx.lineWidth = 2 + audioLevel * 3;
        } else if (state === 'speaking') {
          ctx.strokeStyle = `rgba(168, 85, 247, ${0.45 - i * 0.1})`;
          ctx.lineWidth = 2.5;
        } else if (state === 'thinking') {
          ctx.strokeStyle = `rgba(244, 114, 182, ${0.4 - i * 0.1})`;
          ctx.lineWidth = 1.8;
        } else {
          ctx.strokeStyle = `rgba(59, 130, 246, ${0.2 - i * 0.05})`;
          ctx.lineWidth = 1.2;
        }
        ctx.stroke();
      }

      // Orbiting energy dots
      const dotCount = state === 'thinking' ? 8 : state === 'speaking' ? 6 : 4;
      for (let d = 0; d < dotCount; d++) {
        const dotAngle = angle * (d % 2 === 0 ? 1 : -1) + (d * Math.PI * 2) / dotCount;
        const orbitDist = baseRadius + 22 + (d % 3) * 8;
        const dx = Math.cos(dotAngle) * orbitDist;
        const dy = Math.sin(dotAngle) * orbitDist;

        ctx.beginPath();
        ctx.arc(dx, dy, state === 'listening' ? 3.5 : 2.5, 0, Math.PI * 2);
        ctx.fillStyle =
          state === 'listening'
            ? '#38bdf8'
            : state === 'speaking'
            ? '#c084fc'
            : state === 'thinking'
            ? '#fb7185'
            : '#60a5fa';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [state, audioLevel]);

  // Color scheme & glow based on assistant state
  const getOrbBackground = () => {
    switch (state) {
      case 'listening':
        return 'from-cyan-400 via-sky-500 to-emerald-500 animate-pulse';
      case 'thinking':
        return 'from-pink-500 via-purple-600 to-indigo-600 animate-spin';
      case 'speaking':
        return 'from-violet-500 via-fuchsia-500 to-cyan-400 animate-pulse';
      case 'error':
        return 'from-rose-500 via-amber-600 to-red-600';
      default:
        return 'from-cyan-500 via-blue-600 to-purple-600';
    }
  };

  const getStatusLabel = () => {
    switch (state) {
      case 'listening':
        return interimTranscript || 'Listening to your voice...';
      case 'thinking':
        return 'Mlindos is thinking...';
      case 'speaking':
        return 'Speaking to you...';
      case 'error':
        return 'Tap to retry';
      default:
        return 'Tap orb or mic to speak';
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center my-3 select-none">
      {/* Background radial glow */}
      <div
        className={`absolute w-72 h-72 rounded-full blur-3xl opacity-35 transition-all duration-700 pointer-events-none ${
          state === 'listening'
            ? 'bg-cyan-500 scale-125 opacity-60'
            : state === 'speaking'
            ? 'bg-purple-600 scale-125 opacity-60'
            : state === 'thinking'
            ? 'bg-pink-600 scale-110 opacity-50'
            : 'bg-blue-600 scale-100'
        }`}
      />

      {/* Interactive Orb Container */}
      <div className="relative w-56 h-56 flex items-center justify-center">
        {/* Canvas for procedural orbital rings */}
        <canvas
          ref={canvasRef}
          width={224}
          height={224}
          className="absolute inset-0 pointer-events-none z-10"
        />

        {/* Outer pulsating energy ripple */}
        <div
          className={`absolute inset-4 rounded-full border border-cyan-400/30 transition-all duration-500 ${
            state === 'listening'
              ? 'animate-ping opacity-30 border-cyan-400'
              : state === 'speaking'
              ? 'animate-pulse opacity-40 border-purple-400'
              : 'opacity-15'
          }`}
        />

        {/* Main Central Orb Button */}
        <button
          onClick={onClick}
          type="button"
          aria-label={state === 'listening' ? 'Stop listening' : 'Start speaking to Mlindos Mr Ai voice'}
          className={`relative z-20 w-32 h-32 rounded-full p-[2px] transition-transform duration-300 active:scale-95 cursor-pointer focus:outline-none focus:ring-4 focus:ring-cyan-500/50 shadow-2xl ${
            state === 'listening' ? 'scale-105' : 'hover:scale-105'
          }`}
        >
          {/* Animated gradient border */}
          <div
            className={`w-full h-full rounded-full bg-gradient-to-tr ${getOrbBackground()} flex items-center justify-center p-[3px] shadow-lg transition-all duration-500`}
          >
            {/* Inner dark core with holographic sheen */}
            <div className="relative w-full h-full rounded-full bg-slate-950/90 flex flex-col items-center justify-center overflow-hidden border border-white/20 backdrop-blur-md">
              {/* Radial reflection */}
              <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent rounded-t-full pointer-events-none" />

              {/* Glowing Orb Heart Icon */}
              <div className="relative z-10 flex flex-col items-center justify-center">
                {state === 'listening' ? (
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-6 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-10 bg-sky-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-8 bg-emerald-400 rounded-full animate-bounce" />
                    <span className="w-1.5 h-10 bg-cyan-300 rounded-full animate-bounce [animation-delay:-0.2s]" />
                    <span className="w-1.5 h-5 bg-sky-400 rounded-full animate-bounce [animation-delay:-0.4s]" />
                  </div>
                ) : state === 'speaking' ? (
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-7 bg-fuchsia-400 rounded-full animate-pulse [animation-duration:0.6s]" />
                    <span className="w-2 h-11 bg-purple-300 rounded-full animate-pulse [animation-duration:0.4s]" />
                    <span className="w-2 h-9 bg-cyan-400 rounded-full animate-pulse [animation-duration:0.7s]" />
                    <span className="w-2 h-6 bg-violet-400 rounded-full animate-pulse [animation-duration:0.5s]" />
                  </div>
                ) : state === 'thinking' ? (
                  <div className="relative w-10 h-10 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full border-2 border-pink-400 border-t-transparent animate-spin" />
                    <div className="absolute w-5 h-5 rounded-full border-2 border-cyan-400 border-b-transparent animate-spin [animation-direction:reverse]" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center shadow-inner">
                      <span className="text-xl">🌍</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Subtle state badge */}
              <div className="mt-1">
                <span
                  className={`text-[10px] font-mono tracking-widest uppercase font-bold ${
                    state === 'listening'
                      ? 'text-cyan-300'
                      : state === 'speaking'
                      ? 'text-purple-300'
                      : state === 'thinking'
                      ? 'text-pink-300'
                      : 'text-slate-400'
                  }`}
                >
                  {state}
                </span>
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Status indicator bar under orb */}
      <div className="mt-2 text-center max-w-xs px-3">
        <p
          className={`text-sm font-medium transition-colors duration-300 line-clamp-2 ${
            state === 'listening'
              ? 'text-cyan-300 animate-pulse'
              : state === 'speaking'
              ? 'text-purple-300 font-semibold'
              : state === 'thinking'
              ? 'text-pink-300'
              : 'text-slate-400'
          }`}
        >
          {getStatusLabel()}
        </p>
      </div>
    </div>
  );
};
