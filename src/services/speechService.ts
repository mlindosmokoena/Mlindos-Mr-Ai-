/**
 * Speech Recognition and Speech Synthesis management
 * Optimized for Android Chrome and mobile web browsers
 */

export interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

export interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

export interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

export interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

export interface IWindowSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives?: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string; message?: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  onspeechstart?: (() => void) | null;
  onspeechend?: (() => void) | null;
}

export class SpeechService {
  private recognition: IWindowSpeechRecognition | null = null;
  private isListening: boolean = false;
  private availableVoices: SpeechSynthesisVoice[] = [];
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private isSpeaking: boolean = false;
  private keepAliveTimer: number | null = null;
  private micStream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private audioLevelCallback: ((level: number) => void) | null = null;
  private animationFrameId: number | null = null;
  private lastTranscribedText: string = '';
  private hasDispatchedFinal: boolean = false;

  constructor() {
    this.initVoices();
  }

  /**
   * Check if Speech Recognition is supported in the browser
   */
  public isRecognitionSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(
      (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
    );
  }

  /**
   * Check if Speech Synthesis is supported
   */
  public isSynthesisSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'speechSynthesis' in window;
  }

  /**
   * Unlocks speech synthesis on Android Chrome during a direct user gesture (click/tap)
   */
  public unlockAudio() {
    if (!this.isSynthesisSupported()) return;
    try {
      window.speechSynthesis.resume();
      // Speak an empty string with volume 0 to warm up Android Chrome audio output engine
      const warmup = new SpeechSynthesisUtterance(' ');
      warmup.volume = 0.01;
      warmup.rate = 1.0;
      window.speechSynthesis.speak(warmup);
    } catch {
      // Ignore
    }
  }

  /**
   * Requests explicit microphone permission using getUserMedia.
   * This is critical on Android Chrome to show the native Android system prompt.
   */
  public async requestMicrophonePermission(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Keep or release stream
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (err) {
      console.warn('Microphone permission request failed:', err);
      return false;
    }
  }

  /**
   * Initialize voices with repeated checks for Android Chrome async loading
   */
  public initVoices(): Promise<SpeechSynthesisVoice[]> {
    return new Promise((resolve) => {
      if (!this.isSynthesisSupported()) {
        resolve([]);
        return;
      }

      const updateVoices = () => {
        try {
          const voices = window.speechSynthesis.getVoices();
          if (voices && voices.length > 0) {
            this.availableVoices = voices;
            // Prefer natural, Google, or local voice for current language
            if (!this.selectedVoice) {
              const preferred =
                voices.find(
                  (v) =>
                    v.lang.startsWith('en') &&
                    (v.name.includes('Natural') ||
                      v.name.includes('Google') ||
                      v.name.includes('Samantha') ||
                      v.name.includes('Neural') ||
                      v.name.includes('Siri') ||
                      v.name.includes('Android'))
                ) ||
                voices.find((v) => v.lang.startsWith('en')) ||
                voices[0];
              this.selectedVoice = preferred || null;
            }
            resolve(voices);
            return true;
          }
        } catch {
          // Ignore
        }
        return false;
      };

      if (updateVoices()) return;

      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
          updateVoices();
        };
      }

      // Android Chrome fallback polling
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (updateVoices() || attempts > 10) {
          clearInterval(interval);
          resolve(this.availableVoices);
        }
      }, 250);
    });
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (this.availableVoices.length === 0 && this.isSynthesisSupported()) {
      this.availableVoices = window.speechSynthesis.getVoices();
    }
    return this.availableVoices;
  }

  public setVoice(voiceName: string) {
    const found = this.availableVoices.find((v) => v.name === voiceName);
    if (found) {
      this.selectedVoice = found;
    }
  }

  public getSelectedVoice(): SpeechSynthesisVoice | null {
    return this.selectedVoice;
  }

  /**
   * Set callback for live volume visualization (0.0 to 1.0)
   */
  public setAudioLevelCallback(callback: ((level: number) => void) | null) {
    this.audioLevelCallback = callback;
  }

  private startLiveAudioMeter(stream: MediaStream) {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.audioCtx = new AudioCtx();
      const source = this.audioCtx.createMediaStreamSource(stream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 64;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!this.isListening || !this.analyser) return;
        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const normalized = Math.min(1, avg / 128); // 0 to 1
        if (this.audioLevelCallback) {
          this.audioLevelCallback(normalized);
        }
        this.animationFrameId = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch {
      // Silently ignore audio meter errors
    }
  }

  private stopLiveAudioMeter() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
    this.analyser = null;
    if (this.audioLevelCallback) {
      this.audioLevelCallback(0);
    }
  }

  /**
   * Start microphone listening on Android Chrome / Web Speech API
   */
  public async startListening(
    lang: string,
    onResult: (transcript: string, isFinal: boolean) => void,
    onError: (errorMsg: string) => void,
    onEnd: () => void
  ): Promise<boolean> {
    if (!this.isRecognitionSupported()) {
      onError('Speech recognition is not supported in this browser. Please use the text input below.');
      return false;
    }

    // Stop ongoing speech first
    this.stopSpeaking();
    this.unlockAudio();

    // On Android Chrome, get media stream first for live volume meter and permission prompt
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.startLiveAudioMeter(this.micStream);
      }
    } catch (e: unknown) {
      console.warn('Microphone stream access error:', e);
      onError('Microphone access was denied. Please allow microphone permissions in Android Chrome settings.');
      return false;
    }

    try {
      const RecognitionConstructor =
        (window as unknown as { SpeechRecognition?: new () => IWindowSpeechRecognition }).SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: new () => IWindowSpeechRecognition }).webkitSpeechRecognition;

      if (!RecognitionConstructor) {
        onError('Speech recognition is not available in your browser.');
        this.stopLiveAudioMeter();
        return false;
      }

      this.recognition = new RecognitionConstructor();
      // On mobile Android Chrome, continuous=false is much more reliable
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;
      this.recognition.lang = lang && lang !== 'auto' ? lang : 'en-US';

      this.lastTranscribedText = '';
      this.hasDispatchedFinal = false;

      this.recognition.onstart = () => {
        this.isListening = true;
      };

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTranscript += item[0].transcript;
          } else {
            interimTranscript += item[0].transcript;
          }
        }

        const currentText = (finalTranscript || interimTranscript).trim();
        if (currentText) {
          this.lastTranscribedText = currentText;
        }

        if (finalTranscript.trim()) {
          this.hasDispatchedFinal = true;
          onResult(finalTranscript.trim(), true);
        } else if (interimTranscript.trim()) {
          onResult(interimTranscript.trim(), false);
        }
      };

      this.recognition.onerror = (event: { error: string; message?: string }) => {
        this.isListening = false;
        this.stopLiveAudioMeter();

        let message = 'Microphone error occurred.';
        if (event.error === 'not-allowed') {
          message = 'Microphone access denied. Tap the lock icon in your Android Chrome address bar, grant Microphone permission, and try again.';
        } else if (event.error === 'no-speech') {
          message = 'No speech detected. Please speak closer to your microphone and try again.';
        } else if (event.error === 'network') {
          message = 'Network error while processing speech. Please verify your internet connection.';
        } else if (event.error === 'audio-capture') {
          message = 'No microphone device found on your phone.';
        }

        onError(message);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.stopLiveAudioMeter();

        // Android Chrome Fix: If Android Chrome stopped listening and we had text but never sent isFinal=true, auto-dispatch now!
        if (!this.hasDispatchedFinal && this.lastTranscribedText.trim().length > 0) {
          this.hasDispatchedFinal = true;
          onResult(this.lastTranscribedText.trim(), true);
        }

        onEnd();
      };

      this.recognition.start();
      return true;
    } catch (err: unknown) {
      this.isListening = false;
      this.stopLiveAudioMeter();
      const errorMsg = err instanceof Error ? err.message : 'Failed to start microphone';
      onError(errorMsg);
      return false;
    }
  }

  public stopListening() {
    this.isListening = false;
    this.stopLiveAudioMeter();
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // Silently catch
      }
    }
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Speak text aloud using SpeechSynthesis with Android Chrome keep-alive
   */
  public speak(
    text: string,
    options: {
      rate?: number;
      pitch?: number;
      lang?: string;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: unknown) => void;
    } = {}
  ) {
    if (!this.isSynthesisSupported()) {
      if (options.onEnd) options.onEnd();
      return;
    }

    // Cancel any ongoing speech
    this.stopSpeaking();

    if (!text || text.trim().length === 0) {
      if (options.onEnd) options.onEnd();
      return;
    }

    // Clean text for speech
    const cleanText = text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/#+\s*/g, '')
      .replace(/`.*?`/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/🌍/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .trim();

    // Sentence splitting for smooth Android Chrome playback
    const sentences = cleanText.match(/[^.!?\n]+[.!?\n]+|[^.!?\n]+$/g) || [cleanText];

    let sentenceIndex = 0;
    this.isSpeaking = true;
    if (options.onStart) options.onStart();

    // Android Chrome Keep-Alive timer
    this.startKeepAlive();

    const speakNextChunk = () => {
      if (!this.isSpeaking || sentenceIndex >= sentences.length) {
        this.isSpeaking = false;
        this.stopKeepAlive();
        if (options.onEnd) options.onEnd();
        return;
      }

      const chunk = sentences[sentenceIndex].trim();
      sentenceIndex++;

      if (!chunk) {
        speakNextChunk();
        return;
      }

      try {
        const utterance = new SpeechSynthesisUtterance(chunk);
        utterance.rate = Math.max(0.8, Math.min(1.4, options.rate ?? 1.0));
        utterance.pitch = Math.max(0.8, Math.min(1.3, options.pitch ?? 1.0));

        // Assign voice
        if (this.selectedVoice) {
          utterance.voice = this.selectedVoice;
          utterance.lang = this.selectedVoice.lang;
        } else if (options.lang && options.lang !== 'auto') {
          utterance.lang = options.lang;
        } else {
          utterance.lang = 'en-US';
        }

        utterance.onend = () => {
          speakNextChunk();
        };

        utterance.onerror = (e) => {
          if (e.error !== 'interrupted' && e.error !== 'canceled') {
            console.warn('Speech synthesis chunk error:', e);
            if (options.onError) options.onError(e);
          }
          this.isSpeaking = false;
          this.stopKeepAlive();
          if (options.onEnd) options.onEnd();
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('SpeechSynthesis error:', err);
        this.isSpeaking = false;
        this.stopKeepAlive();
        if (options.onEnd) options.onEnd();
      }
    };

    speakNextChunk();
  }

  private startKeepAlive() {
    this.stopKeepAlive();
    // Android Chrome speech engine pause bug fix
    this.keepAliveTimer = window.setInterval(() => {
      if (this.isSpeaking && 'speechSynthesis' in window) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 10000);
  }

  private stopKeepAlive() {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
  }

  public stopSpeaking() {
    this.isSpeaking = false;
    this.stopKeepAlive();
    if (this.isSynthesisSupported()) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Silently catch
      }
    }
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }
}

export const speechService = new SpeechService();
