/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Settings,
  Sparkles,
  Info,
  RefreshCw,
  MessageSquare,
  Globe,
  Radio,
  CheckCircle2,
  AlertCircle,
  Square,
  Plus,
} from 'lucide-react';
import { AndroidFrame } from './components/AndroidFrame';
import { FuturisticOrb } from './components/FuturisticOrb';
import { AudioWaveform } from './components/AudioWaveform';
import { ChatHistory } from './components/ChatHistory';
import { QuickPrompts } from './components/QuickPrompts';
import { SettingsModal } from './components/SettingsModal';
import { speechService } from './services/speechService';
import { soundEffects } from './services/soundEffects';
import {
  Message,
  AssistantState,
  AssistantSettings,
  DEFAULT_SETTINGS,
  SUPPORTED_LANGUAGES,
} from './types/assistant';

const INITIAL_GREETING_TEXT = "Hello! I am Mlindos Mr Ai voice. How can I help you today?";

export default function App() {
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem('mlindos_messages');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return [
      {
        id: 'welcome-greeting',
        role: 'assistant',
        text: INITIAL_GREETING_TEXT,
        spokenText: INITIAL_GREETING_TEXT,
        timestamp: Date.now(),
        suggestions: [
          'Who are you and what can you do?',
          'Tell me a cool futuristic fact',
          'Sawubona! Ungubani?',
        ],
      },
    ];
  });

  // Persist conversation history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('mlindos_messages', JSON.stringify(messages));
    } catch {
      // LocalStorage quota or unavailable
    }
  }, [messages]);

  const [inputQuery, setInputQuery] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [assistantState, setAssistantState] = useState<AssistantState>('idle');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeSpeakingId, setActiveSpeakingId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [hasSpokenGreeting, setHasSpokenGreeting] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  // UI Modes & Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'orb' | 'chat'>('orb');
  const [isDesktopMode, setIsDesktopMode] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPermissionGuide, setShowPermissionGuide] = useState(false);

  // Settings
  const [settings, setSettings] = useState<AssistantSettings>(() => {
    try {
      const saved = localStorage.getItem('mlindos_settings');
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Sync settings with services and localStorage
  useEffect(() => {
    try {
      localStorage.setItem('mlindos_settings', JSON.stringify(settings));
    } catch {
      // storage unavailable
    }
    soundEffects.setSoundEnabled(settings.soundFx);
    if (settings.selectedVoiceName) {
      speechService.setVoice(settings.selectedVoiceName);
    }
  }, [settings]);

  // Connect live audio volume meter
  useEffect(() => {
    speechService.setAudioLevelCallback((level) => {
      setAudioLevel(level);
    });
    return () => {
      speechService.setAudioLevelCallback(null);
    };
  }, []);

  // Load available system voices on mount
  useEffect(() => {
    speechService.initVoices().then((voices) => {
      setAvailableVoices(voices);
      if (!settings.selectedVoiceName && voices.length > 0) {
        const selected = speechService.getSelectedVoice();
        if (selected) {
          setSettings((prev) => ({ ...prev, selectedVoiceName: selected.name }));
        }
      }
    });

    // Android Chrome touch listener to unlock audio on first interaction
    const unlockOnTouch = () => {
      speechService.unlockAudio();
      setAudioUnlocked(true);
      window.removeEventListener('click', unlockOnTouch);
      window.removeEventListener('touchstart', unlockOnTouch);
    };
    window.addEventListener('click', unlockOnTouch, { once: true });
    window.addEventListener('touchstart', unlockOnTouch, { once: true });

    return () => {
      window.removeEventListener('click', unlockOnTouch);
      window.removeEventListener('touchstart', unlockOnTouch);
    };
  }, []);

  // Speak text aloud helper
  const speakText = useCallback(
    (text: string, messageId?: string) => {
      if (!speechService.isSynthesisSupported()) return;

      // Unlock audio for Android Chrome
      speechService.unlockAudio();
      setAudioUnlocked(true);

      setIsSpeaking(true);
      if (messageId) setActiveSpeakingId(messageId);
      setAssistantState('speaking');

      speechService.speak(text, {
        rate: settings.speechRate,
        pitch: settings.speechPitch,
        lang: settings.language !== 'auto' ? settings.language : undefined,
        onStart: () => {
          setIsSpeaking(true);
          setAssistantState('speaking');
        },
        onEnd: () => {
          setIsSpeaking(false);
          setActiveSpeakingId(null);
          setAssistantState('idle');
        },
        onError: () => {
          setIsSpeaking(false);
          setActiveSpeakingId(null);
          setAssistantState('idle');
        },
      });
    },
    [settings]
  );

  // Stop speaking
  const handleStopSpeaking = useCallback(() => {
    speechService.stopSpeaking();
    setIsSpeaking(false);
    setActiveSpeakingId(null);
    if (assistantState === 'speaking') {
      setAssistantState('idle');
    }
  }, [assistantState]);

  // Play initial greeting aloud
  const handlePlayGreeting = () => {
    setHasSpokenGreeting(true);
    speechService.unlockAudio();
    setAudioUnlocked(true);
    soundEffects.playWakeChime();
    speakText(INITIAL_GREETING_TEXT, 'welcome-greeting');
  };

  // Send message to Gemini server endpoint
  const handleSendMessage = async (textToSend: string) => {
    const query = textToSend.trim();
    if (!query || assistantState === 'thinking') return;

    // Stop speaking any previous message
    handleStopSpeaking();
    setErrorMessage(null);
    setShowPermissionGuide(false);

    // Warm up speech synthesis during the direct user gesture
    speechService.unlockAudio();
    setAudioUnlocked(true);

    const userMessageId = `user-${Date.now()}`;
    const newUserMsg: Message = {
      id: userMessageId,
      role: 'user',
      text: query,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setInputQuery('');
    setInterimTranscript('');
    setAssistantState('thinking');

    try {
      soundEffects.playDoneListeningChime();

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: query,
          history: messages.slice(-6).map((m) => ({
            role: m.role,
            content: m.text,
          })),
          language: settings.language,
          voiceTone: settings.voiceTone,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with ${response.status}`);
      }

      const data = await response.json();
      soundEffects.playSuccessChime();

      const assistantMessageId = `assistant-${Date.now()}`;
      const newAssistantMsg: Message = {
        id: assistantMessageId,
        role: 'assistant',
        text: data.text || "I'm ready for your next question!",
        spokenText: data.spokenText || data.text,
        timestamp: Date.now(),
        suggestions: data.suggestions || [],
      };

      setMessages((prev) => [...prev, newAssistantMsg]);
      setAssistantState('idle');

      // Auto speak if enabled
      if (settings.autoSpeak) {
        speakText(newAssistantMsg.spokenText || newAssistantMsg.text, assistantMessageId);
      }
    } catch (err: unknown) {
      console.error('Error in voice assistant:', err);
      soundEffects.playErrorChime();
      const message = err instanceof Error ? err.message : 'Connection failed. Please try again.';
      setErrorMessage(message);
      setAssistantState('error');

      const fallbackMsg: Message = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        text: `I had trouble connecting to the network: ${message}. Please check your connection or try again.`,
        spokenText: `I had trouble connecting. Please try again.`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, fallbackMsg]);

      setTimeout(() => {
        setAssistantState('idle');
      }, 4000);
    }
  };

  // Toggle microphone listening
  const handleToggleListening = async () => {
    // If speaking, stop speaking first
    if (isSpeaking) {
      handleStopSpeaking();
    }

    if (isListening) {
      speechService.stopListening();
      setIsListening(false);
      setAssistantState('idle');
      soundEffects.playDoneListeningChime();

      // If user had spoken something, send it now
      if (interimTranscript.trim()) {
        handleSendMessage(interimTranscript);
      }
      return;
    }

    if (!speechService.isRecognitionSupported()) {
      setErrorMessage(
        'Speech recognition is not supported in this browser. Please use Android Chrome or type in the text box below.'
      );
      return;
    }

    // Warm up audio and sound effects
    speechService.unlockAudio();
    setAudioUnlocked(true);
    soundEffects.playWakeChime();

    setIsListening(true);
    setAssistantState('listening');
    setInterimTranscript('');
    setErrorMessage(null);
    setShowPermissionGuide(false);

    const targetLang = settings.language === 'auto' ? 'en-US' : settings.language;

    const started = await speechService.startListening(
      targetLang,
      (transcript, isFinal) => {
        setInterimTranscript(transcript);
        if (isFinal && transcript.trim().length > 0) {
          setIsListening(false);
          setAssistantState('idle');
          handleSendMessage(transcript);
        }
      },
      (error) => {
        setIsListening(false);
        setAssistantState('idle');
        setErrorMessage(error);
        soundEffects.playErrorChime();
        if (error.includes('denied') || error.includes('permission')) {
          setShowPermissionGuide(true);
        }
      },
      () => {
        setIsListening(false);
        if (assistantState === 'listening') {
          setAssistantState('idle');
        }
      }
    );

    if (!started) {
      setIsListening(false);
      setAssistantState('idle');
    }
  };

  // Explicit permission request button for Android Chrome
  const handleRequestMicPermission = async () => {
    const granted = await speechService.requestMicrophonePermission();
    if (granted) {
      setShowPermissionGuide(false);
      setErrorMessage(null);
      // Immediately start listening once granted
      handleToggleListening();
    } else {
      setErrorMessage(
        'Permission not granted. Please tap the lock icon in Chrome address bar and allow Microphone.'
      );
    }
  };

  // Copy helper
  const handleCopyText = (text: string, id: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Clear history and start a brand new conversation
  const handleClearHistory = () => {
    handleStopSpeaking();
    const freshMessages: Message[] = [
      {
        id: `greeting-${Date.now()}`,
        role: 'assistant',
        text: INITIAL_GREETING_TEXT,
        spokenText: INITIAL_GREETING_TEXT,
        timestamp: Date.now(),
        suggestions: [
          'What are the 7 wonders of the modern world?',
          'Translate "Have a great day" to Spanish',
          'Tell me something interesting',
        ],
      },
    ];
    setMessages(freshMessages);
    setInputQuery('');
    setInterimTranscript('');
    setErrorMessage(null);
    try {
      localStorage.removeItem('mlindos_messages');
    } catch {
      // ignore
    }
  };

  // Test voice in settings
  const handleTestVoice = () => {
    speechService.unlockAudio();
    speechService.speak(
      'Greetings! This is Mlindos Mr Ai voice, speaking aloud for you on Android Chrome.',
      {
        rate: settings.speechRate,
        pitch: settings.speechPitch,
      }
    );
  };

  // Current language display info
  const currentLangObj =
    SUPPORTED_LANGUAGES.find((l) => l.code === settings.language) || SUPPORTED_LANGUAGES[0];

  return (
    <AndroidFrame
      isDesktopMode={isDesktopMode}
      onToggleFrame={() => setIsDesktopMode(!isDesktopMode)}
      assistantTitle="Mlindos Mr Ai voice 🌍"
    >
      <div className="flex-1 flex flex-col h-full bg-gradient-to-b from-slate-950 via-[#050b1d] to-[#020617] text-slate-100 overflow-hidden relative">
        {/* Top Futuristic Header */}
        <header className="px-4 py-3 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md z-20 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-sky-600 to-indigo-600 flex items-center justify-center text-base shadow-md shadow-cyan-500/30 font-bold border border-cyan-400/30">
                🌍
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-950 animate-pulse" />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-extrabold text-sm tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-sky-400 font-display">
                  Mlindos Mr Ai
                </h1>
                <span className="px-1.5 py-0.2 rounded-md bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 text-[9px] font-mono uppercase tracking-wider font-semibold">
                  Voice
                </span>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <span>
                  {currentLangObj.flag} {currentLangObj.localName}
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-cyan-400 font-medium capitalize">{settings.voiceTone}</span>
              </p>
            </div>
          </div>

          {/* Top Right Controls */}
          <div className="flex items-center gap-1.5">
            {/* New Conversation Button */}
            <button
              type="button"
              onClick={handleClearHistory}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-cyan-950/70 border border-slate-700/80 hover:border-cyan-500/40 text-xs text-slate-300 hover:text-cyan-200 transition-all shadow-sm active:scale-95"
              title="Start a new conversation"
            >
              <Plus size={14} className="text-cyan-400" />
              <span className="hidden sm:inline font-medium">New Chat</span>
            </button>

            {/* View Switcher: Orb vs Chat */}
            <div className="flex items-center bg-slate-900/90 p-0.5 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('orb')}
                className={`p-1.5 rounded-lg text-xs transition-all ${
                  activeTab === 'orb'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Voice Assistant Orb"
              >
                <Radio size={15} />
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className={`relative p-1.5 rounded-lg text-xs transition-all ${
                  activeTab === 'chat'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="View Conversation History"
              >
                <MessageSquare size={15} />
                {messages.length > 1 && (
                  <span className="absolute -top-1 -right-1 px-1 min-w-3.5 h-3.5 rounded-full bg-cyan-400 text-slate-950 font-extrabold text-[9px] flex items-center justify-center shadow-sm">
                    {messages.length}
                  </span>
                )}
              </button>
            </div>

            {/* Mute/Voice Output Toggle */}
            <button
              type="button"
              onClick={() => {
                if (isSpeaking) {
                  handleStopSpeaking();
                }
                setSettings((s) => ({ ...s, autoSpeak: !s.autoSpeak }));
              }}
              className={`p-2 rounded-xl border transition-all ${
                settings.autoSpeak
                  ? 'bg-slate-800/80 border-slate-700 text-cyan-400'
                  : 'bg-rose-950/30 border-rose-900/50 text-rose-400'
              }`}
              title={settings.autoSpeak ? 'Voice output enabled' : 'Voice output muted'}
            >
              {settings.autoSpeak ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            {/* Settings Button */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white transition-all"
              title="Settings & Languages"
            >
              <Settings size={16} />
            </button>
          </div>
        </header>

        {/* Android Chrome Microphone Permission Helper Banner */}
        {showPermissionGuide && (
          <div className="mx-3 mt-2 p-3.5 rounded-2xl bg-amber-950/90 border border-amber-500/50 text-amber-100 z-30 shadow-2xl animate-fadeIn">
            <div className="flex items-start gap-2.5">
              <AlertCircle size={18} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs">
                <p className="font-bold text-amber-200 mb-1">
                  Microphone Access Required on Android Chrome
                </p>
                <p className="text-amber-300/90 leading-relaxed mb-2.5">
                  To speak directly to Mlindos Mr Ai voice:
                  <br />
                  1. Tap the button below to prompt Android&apos;s permission dialog.
                  <br />
                  2. Or tap the 🔒 lock icon in Chrome&apos;s top address bar → Site Settings →
                  Microphone → <strong>Allow</strong>.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRequestMicPermission}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-bold hover:bg-amber-300 transition-colors shadow-sm text-xs flex items-center gap-1.5"
                  >
                    <Mic size={14} />
                    <span>Grant Microphone Permission</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPermissionGuide(false)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 text-amber-200 hover:text-white text-xs"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* General Error notification banner if any */}
        {errorMessage && !showPermissionGuide && (
          <div className="bg-rose-950/80 border-b border-rose-800/70 px-4 py-2 text-xs text-rose-200 flex items-center justify-between z-20 animate-fadeIn">
            <span className="flex-1 mr-2">{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-white font-bold px-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Friendly greeting callout banner (with 1-tap Listen & Audio Unlock) */}
        {!hasSpokenGreeting && messages.length <= 1 && (
          <div className="mx-4 mt-2 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-950/60 to-purple-950/60 border border-cyan-500/40 flex items-center justify-between shadow-lg shadow-cyan-500/10 z-10 animate-pulse">
            <div className="flex items-center gap-2">
              <span className="text-lg">👋</span>
              <div>
                <p className="text-xs text-cyan-200 font-semibold">
                  Hello! I am Mlindos Mr Ai voice.
                </p>
                <p className="text-[10px] text-slate-400">
                  Tap to hear me speak and enable voice audio!
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handlePlayGreeting}
              className="px-3 py-1.5 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400 transition-colors flex items-center gap-1.5 shadow-sm active:scale-95 shrink-0"
            >
              <Volume2 size={14} />
              <span>Listen</span>
            </button>
          </div>
        )}

        {/* Main Center Area: Either Futuristic Orb View or Chat History View */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {activeTab === 'orb' ? (
            <div className="flex-1 flex flex-col justify-between py-1 overflow-y-auto">
              {/* Latest Assistant Spoken Prompt / Answer Card */}
              <div className="px-4 my-auto">
                <div className="relative mx-auto max-w-sm rounded-3xl bg-slate-900/70 border border-slate-800/90 p-4 shadow-xl backdrop-blur-md">
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-800">
                    <span className="text-[11px] font-mono text-cyan-400 tracking-wider uppercase font-semibold flex items-center gap-1.5">
                      <Sparkles size={12} />
                      <span>{assistantState === 'speaking' ? 'Speaking now' : 'Latest Response'}</span>
                    </span>

                    {/* Audio status or speak toggle */}
                    {isSpeaking ? (
                      <button
                        type="button"
                        onClick={handleStopSpeaking}
                        className="text-[11px] text-rose-300 font-medium flex items-center gap-1 bg-rose-950/60 px-2.5 py-1 rounded-full border border-rose-700/60 shadow-sm animate-pulse"
                      >
                        <Square size={11} className="fill-rose-300" />
                        <span>Stop Voice</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const lastMsg = [...messages].reverse().find((m) => m.role === 'assistant');
                          if (lastMsg) speakText(lastMsg.spokenText || lastMsg.text, lastMsg.id);
                        }}
                        className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1.5 bg-cyan-950/40 px-2.5 py-1 rounded-full border border-cyan-800/40 transition-colors"
                      >
                        <Volume2 size={13} />
                        <span>Replay Voice</span>
                      </button>
                    )}
                  </div>

                  <p className="text-sm text-slate-200 leading-relaxed font-normal max-h-36 overflow-y-auto pr-1">
                    {messages[messages.length - 1]?.text || INITIAL_GREETING_TEXT}
                  </p>

                  {messages.length > 1 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-mono">
                        {messages.length} messages in conversation
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('chat')}
                        className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 transition-colors"
                      >
                        <span>View History →</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* The Glowing Futuristic Orb with touch to speak */}
              <div className="my-auto py-1">
                <FuturisticOrb
                  state={assistantState}
                  onClick={handleToggleListening}
                  interimTranscript={interimTranscript}
                  audioLevel={audioLevel}
                />
              </div>

              {/* Audio Waveform Equalizer (reacts to user speech amplitude) */}
              <div className="w-full">
                <AudioWaveform state={assistantState} height={32} audioLevel={audioLevel} />
              </div>

              {/* Quick Prompts Row */}
              <div className="w-full">
                <QuickPrompts
                  onSelect={(query) => handleSendMessage(query)}
                  disabled={assistantState === 'thinking'}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              <ChatHistory
                messages={messages}
                isSpeaking={isSpeaking}
                activeSpeakingId={activeSpeakingId}
                onSpeakMessage={(msg) => speakText(msg.spokenText || msg.text, msg.id)}
                onStopSpeaking={handleStopSpeaking}
                onClearHistory={handleClearHistory}
                onSelectSuggestion={(sug) => handleSendMessage(sug)}
                copiedId={copiedId}
                onCopy={handleCopyText}
              />
              <div className="w-full bg-slate-950/90 border-t border-slate-900">
                <AudioWaveform state={assistantState} height={24} audioLevel={audioLevel} />
              </div>
            </div>
          )}
        </main>

        {/* Live Active Voice Bar when listening */}
        {isListening && (
          <div className="mx-3 mb-2 p-3 rounded-2xl bg-gradient-to-r from-rose-950/90 via-slate-900 to-cyan-950/90 border border-rose-500/50 shadow-2xl flex items-center justify-between animate-fadeIn z-30">
            <div className="flex items-center gap-2.5 flex-1 min-w-0 mr-2">
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                  <span>Listening...</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    (Speak now into your microphone)
                  </span>
                </p>
                <p className="text-xs text-white truncate font-medium">
                  {interimTranscript || 'Listening to your voice...'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleToggleListening}
                className="px-3 py-1.5 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400 transition-colors shadow-sm"
              >
                Send
              </button>
            </div>
          </div>
        )}

        {/* Bottom Input Bar with Text Box & Glowing Microphone Button */}
        <footer className="p-3 bg-slate-950/95 border-t border-slate-800/90 z-20 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputQuery);
            }}
            className="flex items-center gap-2 max-w-lg mx-auto"
          >
            {/* Text Input Box */}
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder={
                  isListening
                    ? 'Listening... Speak now or tap mic to send'
                    : 'Ask Mlindos anything, or tap mic...'
                }
                disabled={assistantState === 'thinking'}
                className="w-full pl-4 pr-10 py-3 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all shadow-inner"
              />

              {inputQuery.trim() && (
                <button
                  type="submit"
                  aria-label="Send message"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-xl bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors"
                >
                  <Send size={15} />
                </button>
              )}
            </div>

            {/* Glowing Microphone Button (Works on Android Chrome) */}
            <button
              type="button"
              onClick={handleToggleListening}
              aria-label={isListening ? 'Stop listening and send' : 'Start speaking'}
              className={`relative p-3.5 rounded-2xl transition-all duration-300 flex items-center justify-center shrink-0 cursor-pointer shadow-lg active:scale-95 touch-manipulation ${
                isListening
                  ? 'bg-rose-500 text-white shadow-[0_0_25px_rgba(244,63,94,0.6)] animate-pulse ring-4 ring-rose-500/40'
                  : 'bg-gradient-to-tr from-cyan-400 via-sky-500 to-indigo-600 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:scale-105'
              }`}
            >
              {isListening ? (
                <MicOff size={22} className="text-white animate-bounce" />
              ) : (
                <Mic size={22} className="text-slate-950 font-bold" />
              )}

              {/* Pulsing glow ring when listening */}
              {isListening && (
                <span className="absolute inset-0 rounded-2xl bg-rose-400 animate-ping opacity-45 pointer-events-none" />
              )}
            </button>
          </form>

          {/* Quick Footer indicator */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 px-1">
            <span className="flex items-center gap-1.5 font-mono">
              <span
                className={`w-2 h-2 rounded-full ${
                  assistantState === 'listening'
                    ? 'bg-rose-400 animate-ping'
                    : assistantState === 'speaking'
                    ? 'bg-purple-400 animate-pulse'
                    : assistantState === 'thinking'
                    ? 'bg-cyan-400 animate-spin'
                    : 'bg-emerald-400'
                }`}
              />
              <span className="capitalize">{assistantState}</span>
            </span>

            <span className="text-[10px] text-slate-400 font-medium">
              Android Chrome Voice Engine • Web Speech & TTS
            </span>
          </div>
        </footer>

        {/* Settings Modal */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onUpdateSettings={setSettings}
          availableVoices={availableVoices}
          onTestVoice={handleTestVoice}
        />
      </div>
    </AndroidFrame>
  );
}
