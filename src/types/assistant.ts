export type AssistantState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  spokenText?: string;
  timestamp: number;
  suggestions?: string[];
}

export interface SupportedLanguage {
  code: string;
  name: string;
  localName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'auto', name: 'Auto Detect (Worldwide)', localName: 'Worldwide', flag: '🌍' },
  { code: 'en-US', name: 'English (US/UK)', localName: 'English', flag: '🇬🇧' },
  { code: 'zu-ZA', name: 'isiZulu', localName: 'isiZulu', flag: '🇿🇦' },
  { code: 'xh-ZA', name: 'isiXhosa', localName: 'isiXhosa', flag: '🇿🇦' },
  { code: 'sw-KE', name: 'Kiswahili', localName: 'Kiswahili', flag: '🇰🇪' },
  { code: 'af-ZA', name: 'Afrikaans', localName: 'Afrikaans', flag: '🇿🇦' },
  { code: 'es-ES', name: 'Spanish', localName: 'Español', flag: '🇪🇸' },
  { code: 'fr-FR', name: 'French', localName: 'Français', flag: '🇫🇷' },
  { code: 'pt-BR', name: 'Portuguese', localName: 'Português', flag: '🇧🇷' },
  { code: 'de-DE', name: 'German', localName: 'Deutsch', flag: '🇩🇪' },
  { code: 'ar-SA', name: 'Arabic', localName: 'العربية', flag: '🇸🇦' },
  { code: 'hi-IN', name: 'Hindi', localName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ja-JP', name: 'Japanese', localName: '日本語', flag: '🇯🇵' },
  { code: 'zh-CN', name: 'Chinese', localName: '中文', flag: '🇨🇳' },
];

export interface AssistantSettings {
  language: string;
  autoSpeak: boolean;
  speechRate: number;
  speechPitch: number;
  voiceTone: 'futuristic' | 'concise' | 'friendly' | 'humorous';
  soundFx: boolean;
  selectedVoiceName: string;
  continuousListening: boolean;
}

export const DEFAULT_SETTINGS: AssistantSettings = {
  language: 'auto',
  autoSpeak: true,
  speechRate: 1.05,
  speechPitch: 1.0,
  voiceTone: 'futuristic',
  soundFx: true,
  selectedVoiceName: '',
  continuousListening: false,
};
