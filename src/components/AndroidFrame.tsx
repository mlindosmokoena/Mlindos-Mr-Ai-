import React, { useState, useEffect } from 'react';
import { Wifi, Battery, Smartphone, Maximize2, Sparkles } from 'lucide-react';

interface AndroidFrameProps {
  children: React.ReactNode;
  isDesktopMode: boolean;
  onToggleFrame: () => void;
  assistantTitle: string;
}

export const AndroidFrame: React.FC<AndroidFrameProps> = ({
  children,
  isDesktopMode,
  onToggleFrame,
  assistantTitle,
}) => {
  const [time, setTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#020617] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#030712] to-black text-slate-100 flex flex-col items-center justify-center p-0 md:p-6 overflow-hidden">
      {/* Desktop Top Bar: Mode switcher & Branding */}
      <div className="hidden md:flex items-center justify-between w-full max-w-4xl mb-4 px-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center text-sm shadow-md shadow-cyan-500/20">
            🌍
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide">{assistantTitle}</h1>
            <p className="text-[11px] text-slate-400">Futuristic Worldwide Voice Assistant</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleFrame}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 text-xs text-slate-300 hover:text-white transition-all shadow-sm"
        >
          {isDesktopMode ? (
            <>
              <Smartphone size={14} className="text-cyan-400" />
              <span>Switch to Android Phone Mockup</span>
            </>
          ) : (
            <>
              <Maximize2 size={14} className="text-purple-400" />
              <span>Full Screen Mode</span>
            </>
          )}
        </button>
      </div>

      {/* Main Container: Android Phone Shell or Full Edge-to-Edge */}
      <div
        className={`w-full transition-all duration-300 flex flex-col ${
          !isDesktopMode
            ? 'md:max-w-[420px] md:h-[860px] md:rounded-[44px] md:border-[10px] md:border-slate-800/90 md:shadow-[0_0_60px_-15px_rgba(6,182,212,0.35)] relative overflow-hidden bg-slate-950 ring-1 ring-white/10'
            : 'max-w-4xl h-full md:min-h-[820px] md:rounded-3xl md:border border-slate-800/80 bg-slate-950/80 shadow-2xl relative overflow-hidden'
        } h-[100dvh]`}
      >
        {/* Android Punch Hole & Status Bar */}
        <div className="w-full pt-2 pb-1 px-6 flex items-center justify-between text-xs text-slate-400 select-none bg-slate-950/90 backdrop-blur-md z-30 shrink-0">
          <span className="font-semibold text-slate-200 text-xs tracking-tight">{time}</span>

          {/* Android Punch Hole Camera */}
          <div className="w-4 h-4 rounded-full bg-black border border-slate-800 flex items-center justify-center shadow-inner">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-900 ring-1 ring-cyan-500/20" />
          </div>

          {/* Status Icons */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-cyan-400 font-mono tracking-tighter">5G</span>
            <Wifi size={13} className="text-slate-300" />
            <Battery size={14} className="text-emerald-400" />
          </div>
        </div>

        {/* Inner Phone Content */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {children}
        </div>

        {/* Android Gesture Navigation Bar (at the bottom) */}
        <div className="w-full py-2 flex items-center justify-center bg-slate-950/95 shrink-0 z-30 border-t border-slate-900/50">
          <div className="w-32 h-1 rounded-full bg-slate-600/60 transition-all hover:bg-slate-400 cursor-pointer" />
        </div>
      </div>
    </div>
  );
};
