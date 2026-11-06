import React from 'react';

interface QuickPromptsProps {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

const SAMPLE_PROMPTS = [
  { label: '🌍 Who are you?', query: 'Who are you and what makes Mlindos Mr Ai voice special?' },
  { label: '🇿🇦 Sawubona (isiZulu)', query: 'Sawubona Mlindos! Ungangisiza kanjani namhlanje?' },
  { label: '🚀 Space Fact', query: 'Tell me a mind-blowing fact about outer space and black holes!' },
  { label: '💡 Futuristic Idea', query: 'Give me 3 revolutionary futuristic technology ideas for 2030.' },
  { label: '⚡ Motivation', query: 'Give me a powerful, energetic motivational speech to conquer my day!' },
  { label: '😄 Tell a Joke', query: 'Tell me a clever, funny joke to brighten my mood.' },
  { label: '🌐 Translate', query: 'Translate "Welcome to the future of voice AI" into 3 languages.' },
];

export const QuickPrompts: React.FC<QuickPromptsProps> = ({ onSelect, disabled }) => {
  return (
    <div className="w-full overflow-x-auto py-2 px-4 no-scrollbar">
      <div className="flex items-center gap-2 min-w-max">
        {SAMPLE_PROMPTS.map((item, index) => (
          <button
            key={index}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(item.query)}
            className="px-3 py-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700/80 active:bg-cyan-900/60 border border-slate-700/60 hover:border-cyan-500/50 text-xs text-slate-300 hover:text-white transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap flex items-center gap-1.5"
          >
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
