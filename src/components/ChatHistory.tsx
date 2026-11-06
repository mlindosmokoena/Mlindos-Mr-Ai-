import React, { useRef, useEffect } from 'react';
import {
  Volume2,
  Square,
  Copy,
  Check,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { Message } from '../types/assistant';

interface ChatHistoryProps {
  messages: Message[];
  isSpeaking: boolean;
  activeSpeakingId: string | null;
  onSpeakMessage: (message: Message) => void;
  onStopSpeaking: () => void;
  onClearHistory: () => void;
  onSelectSuggestion: (suggestion: string) => void;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({
  messages,
  isSpeaking,
  activeSpeakingId,
  onSpeakMessage,
  onStopSpeaking,
  onClearHistory,
  onSelectSuggestion,
  copiedId,
  onCopy,
}) => {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400">
        <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-3xl mb-3 shadow-inner">
          🎙️
        </div>
        <p className="text-base font-semibold text-slate-200">Ready to speak</p>
        <p className="text-xs text-slate-400 max-w-xs mt-1">
          Tap the glowing microphone or type below to start talking to Mlindos Mr Ai voice 🌍.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header with clear button */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/80 bg-slate-900/40 text-xs">
        <span className="text-slate-400 font-medium flex items-center gap-1.5">
          <Sparkles size={13} className="text-cyan-400" />
          <span>Conversation ({messages.length})</span>
        </span>
        <button
          onClick={onClearHistory}
          type="button"
          className="text-slate-400 hover:text-cyan-300 transition-colors flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-slate-800 border border-slate-800 text-[11px] font-medium"
          title="Clear all messages and start a fresh conversation"
        >
          <Trash2 size={13} className="text-slate-400 group-hover:text-rose-400" />
          <span>New Chat</span>
        </button>
      </div>

      {/* Messages stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const isCurrentlySpeakingThis = isSpeaking && activeSpeakingId === msg.id;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-fadeIn`}
            >
              {/* Message Bubble */}
              <div
                className={`relative max-w-[88%] sm:max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed transition-all shadow-md ${
                  isUser
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-xs'
                    : 'bg-slate-800/90 border border-slate-700/70 text-slate-100 rounded-tl-xs backdrop-blur-sm'
                }`}
              >
                {/* Assistant avatar badge */}
                {!isUser && (
                  <div className="flex items-center gap-2 mb-1.5 pb-1 border-b border-slate-700/50">
                    <span className="w-4 h-4 rounded-full bg-cyan-400/20 text-cyan-400 flex items-center justify-center text-[10px] font-bold">
                      🌍
                    </span>
                    <span className="text-xs font-semibold text-cyan-300">
                      Mlindos Mr Ai voice
                    </span>
                    {isCurrentlySpeakingThis && (
                      <span className="text-[10px] text-purple-300 bg-purple-900/50 px-1.5 py-0.5 rounded-full font-mono flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
                        Speaking
                      </span>
                    )}
                  </div>
                )}

                {/* Text Content */}
                <div className="whitespace-pre-wrap break-words text-[13px] font-normal">
                  {msg.text}
                </div>

                {/* Action buttons (only for assistant responses) */}
                {!isUser && (
                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-700/40 text-xs">
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onCopy(msg.text, msg.id)}
                        className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700/60 transition-colors"
                        title="Copy response"
                      >
                        {copiedId === msg.id ? (
                          <Check size={14} className="text-emerald-400" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>

                      {isCurrentlySpeakingThis ? (
                        <button
                          type="button"
                          onClick={onStopSpeaking}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-medium"
                        >
                          <Square size={12} className="fill-rose-300" />
                          <span>Stop</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onSpeakMessage(msg)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-[11px] font-medium transition-colors"
                        >
                          <Volume2 size={12} />
                          <span>Speak</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Follow-up suggestions */}
              {!isUser && msg.suggestions && msg.suggestions.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5 max-w-[88%] sm:max-w-[80%]">
                  {msg.suggestions.map((suggestion, sIdx) => (
                    <button
                      key={sIdx}
                      type="button"
                      onClick={() => onSelectSuggestion(suggestion)}
                      className="text-left text-xs bg-slate-800/70 hover:bg-cyan-950/60 text-slate-300 hover:text-cyan-200 border border-slate-700/60 hover:border-cyan-500/40 rounded-xl px-2.5 py-1.5 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                    >
                      <span className="text-cyan-400 text-xs">💬</span>
                      <span className="truncate max-w-[220px]">{suggestion}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
