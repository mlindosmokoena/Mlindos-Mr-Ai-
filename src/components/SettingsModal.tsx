import React from 'react';
import {
  X,
  Volume2,
  Sliders,
  Globe,
  Sparkles,
  RotateCcw,
  VolumeX,
} from 'lucide-react';
import {
  AssistantSettings,
  DEFAULT_SETTINGS,
  SUPPORTED_LANGUAGES,
} from '../types/assistant';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AssistantSettings;
  onUpdateSettings: (newSettings: AssistantSettings) => void;
  availableVoices: SpeechSynthesisVoice[];
  onTestVoice: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  availableVoices,
  onTestVoice,
}) => {
  if (!isOpen) return null;

  const handleChange = <K extends keyof AssistantSettings>(
    key: K,
    value: AssistantSettings[K]
  ) => {
    onUpdateSettings({
      ...settings,
      [key]: value,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-slate-900/95 border border-slate-700/80 rounded-3xl p-6 shadow-2xl text-slate-100 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 text-cyan-400 border border-cyan-500/30">
              <Sliders size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">Assistant Settings</h2>
              <p className="text-xs text-slate-400">Configure Mlindos Mr Ai voice 🌍</p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto py-4 space-y-5 pr-1 text-sm">
          {/* Language Selection */}
          <div>
            <label className="flex items-center gap-2 font-medium text-slate-300 mb-2">
              <Globe size={16} className="text-cyan-400" />
              <span>Worldwide Language</span>
            </label>
            <select
              value={settings.language}
              onChange={(e) => handleChange('language', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.name} ({lang.localName})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Supports multilingual voice speech and automated translation.
            </p>
          </div>

          {/* Voice Personality / Tone */}
          <div>
            <label className="flex items-center gap-2 font-medium text-slate-300 mb-2">
              <Sparkles size={16} className="text-purple-400" />
              <span>Voice Tone & Style</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: 'futuristic', label: '🚀 Futuristic', desc: 'High-tech & crisp' },
                  { id: 'friendly', label: '😊 Friendly', desc: 'Warm & welcoming' },
                  { id: 'concise', label: '⚡ Concise', desc: 'Direct & fast' },
                  { id: 'humorous', label: '😄 Witty', desc: 'Playful & clever' },
                ] as const
              ).map((tone) => (
                <button
                  key={tone.id}
                  type="button"
                  onClick={() => handleChange('voiceTone', tone.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    settings.voiceTone === tone.id
                      ? 'bg-purple-600/20 border-purple-500 text-white ring-1 ring-purple-500'
                      : 'bg-slate-800/60 border-slate-700/70 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <p className="font-semibold text-xs">{tone.label}</p>
                  <p className="text-[10px] text-slate-400">{tone.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* TTS Voice Output Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 font-medium text-slate-300">
                <Volume2 size={16} className="text-cyan-400" />
                <span>Text-to-Speech Voice</span>
              </label>
              <button
                type="button"
                onClick={onTestVoice}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-medium underline flex items-center gap-1"
              >
                Test Voice
              </button>
            </div>
            {availableVoices.length > 0 ? (
              <select
                value={settings.selectedVoiceName}
                onChange={(e) => handleChange('selectedVoiceName', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white focus:outline-none focus:border-cyan-400 text-xs"
              >
                <option value="">Default AI System Voice</option>
                {availableVoices.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-slate-400 italic bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/50">
                Using default browser voice synthesizer.
              </p>
            )}
          </div>

          {/* Speech Rate & Pitch */}
          <div className="space-y-3 bg-slate-800/40 p-3 rounded-2xl border border-slate-700/60">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Speech Rate</span>
                <span className="text-cyan-400 font-mono">{settings.speechRate.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.75"
                max="1.4"
                step="0.05"
                value={settings.speechRate}
                onChange={(e) => handleChange('speechRate', parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Speech Pitch</span>
                <span className="text-cyan-400 font-mono">{settings.speechPitch.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="1.3"
                step="0.05"
                value={settings.speechPitch}
                onChange={(e) => handleChange('speechPitch', parseFloat(e.target.value))}
                className="w-full accent-purple-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            {/* Auto speak */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/50 border border-slate-700/60">
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-lg ${settings.autoSpeak ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-700 text-slate-400'}`}>
                  {settings.autoSpeak ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </div>
                <div>
                  <p className="font-semibold text-xs text-white">Speak Answers Aloud</p>
                  <p className="text-[10px] text-slate-400">Read AI answers automatically via voice</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleChange('autoSpeak', !settings.autoSpeak)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${
                  settings.autoSpeak ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                    settings.autoSpeak ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Sound Effects */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/50 border border-slate-700/60">
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-lg ${settings.soundFx ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-700 text-slate-400'}`}>
                  <Sparkles size={16} />
                </div>
                <div>
                  <p className="font-semibold text-xs text-white">Futuristic Sound Effects</p>
                  <p className="text-[10px] text-slate-400">Play wake & notification chimes</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleChange('soundFx', !settings.soundFx)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${
                  settings.soundFx ? 'bg-purple-600' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                    settings.soundFx ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onUpdateSettings(DEFAULT_SETTINGS)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <RotateCcw size={14} />
            <span>Reset Defaults</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-xs font-semibold hover:opacity-95 shadow-lg shadow-cyan-500/20"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
