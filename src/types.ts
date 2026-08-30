/**
 * Types for Sarvam AI Hindi Voice Platform
 */

export interface VoiceCharacter {
  id: string;
  name: string;
  hindiName: string;
  gender: 'male' | 'female';
  desc: string;
  prebuiltVoice: string; // Gemini voice: 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
}

export interface TTSRequest {
  text: string;
  voiceId: string;
  speed: number;
  pitch: 'low' | 'medium' | 'high';
  emotion: string;
}

export interface TTSHistoryItem {
  id: string;
  text: string;
  voiceName: string;
  gender: 'male' | 'female';
  timestamp: string;
  audioBase64?: string; // Stored audio data for instant replay and download
  audioUrl?: string;
  duration?: string;
}

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  audioBase64?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  audioBase64?: string;
  audioUrl?: string;
  isPlaying?: boolean;
}

export interface STTResult {
  id: string;
  transcript: string;
  englishTranslation?: string;
  timestamp: string;
  duration?: number;
}
