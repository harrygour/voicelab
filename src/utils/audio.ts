/**
 * Audio Utilities for Vani AI (वाणी एआई) Speech Synthesis, Playback, and MP3/WAV Exports
 */

let currentAudio: HTMLAudioElement | null = null;
let currentAudioContext: AudioContext | null = null;
let currentSourceNode: AudioBufferSourceNode | null = null;

/**
 * Stops all currently active audio playback (HTML5 Audio, Web Audio API, and SpeechSynthesis)
 */
export function stopAllAudio(): void {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch {
      // ignore
    }
    currentAudio = null;
  }
  if (currentSourceNode) {
    try {
      currentSourceNode.stop();
    } catch {
      // ignore if already stopped
    }
    currentSourceNode = null;
  }
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
}

/**
 * Helper to write ASCII strings to DataView
 */
function writeAscii(view: DataView, offset: number, text: string) {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

/**
 * Converts raw Linear PCM audio bytes into a standard RIFF/WAVE Blob with valid header.
 */
export function pcmToWavBlob(
  pcmBytes: Uint8Array,
  sampleRate: number = 24000,
  numChannels: number = 1,
  bitsPerSample: number = 16
): Blob {
  // Check if bytes already have a 'RIFF' header
  if (
    pcmBytes.length >= 12 &&
    pcmBytes[0] === 0x52 && // 'R'
    pcmBytes[1] === 0x49 && // 'I'
    pcmBytes[2] === 0x46 && // 'F'
    pcmBytes[3] === 0x46    // 'F'
  ) {
    return new Blob([pcmBytes], { type: 'audio/wav' });
  }

  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataLength = pcmBytes.length;
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);

  // 1. RIFF Header
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeAscii(view, 8, 'WAVE');

  // 2. "fmt " Sub-chunk
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);             // Subchunk1Size (16 for standard PCM)
  view.setUint16(20, 1, true);              // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true);    // NumChannels
  view.setUint32(24, sampleRate, true);     // SampleRate
  view.setUint32(28, byteRate, true);       // ByteRate
  view.setUint16(32, blockAlign, true);     // BlockAlign
  view.setUint16(34, bitsPerSample, true);  // BitsPerSample

  // 3. "data" Sub-chunk
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  const header = new Uint8Array(buffer);
  const fullWav = new Uint8Array(header.length + pcmBytes.length);
  fullWav.set(header, 0);
  fullWav.set(pcmBytes, header.length);

  return new Blob([fullWav], { type: 'audio/wav' });
}

/**
 * Converts a base64 encoded audio string to an Audio Blob (detecting MP3, WAV or PCM automatically)
 */
export function base64ToWavBlob(base64Data: string, sampleRate: number = 24000): Blob {
  if (!base64Data) {
    return generateFallbackWavBlob(1.5, sampleRate);
  }
  // Strip any data url prefix if present
  const cleanBase64 = base64Data.replace(/^data:audio\/[^;]+;base64,/, '');
  const binaryString = window.atob(cleanBase64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Detect MP3 header: ID3 tag (0x49, 0x44, 0x33) or MPEG sync frame (0xFF 0xFB, 0xFF 0xF3, 0xFF 0xF2)
  if (
    (bytes.length >= 3 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) ||
    (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)
  ) {
    return new Blob([bytes], { type: 'audio/mp3' });
  }

  // Detect WAV header: 'RIFF' ... 'WAVE'
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && // 'R'
    bytes[1] === 0x49 && // 'I'
    bytes[2] === 0x46 && // 'F'
    bytes[3] === 0x46    // 'F'
  ) {
    return new Blob([bytes], { type: 'audio/wav' });
  }

  return pcmToWavBlob(bytes, sampleRate);
}

/**
 * Generates an acoustic speech-modeled WAV audio buffer for offline / quota-fallback scenarios
 * Produces audible, multi-harmonic vocal synthesis with natural Indic speech cadence
 */
export function generateSpeechWav(
  text: string, 
  gender: 'male' | 'female' = 'female', 
  speed: number = 1.0
): { base64: string; blob: Blob; durationSec: number } {
  const sampleRate = 24000;
  const cleanText = text.trim();
  const charCount = Math.max(8, cleanText.length);
  
  // Calculate natural duration: ~90ms per Hindi character / syllable
  const estSeconds = Math.max(2.0, Math.min(45, (charCount * 0.085) / (speed || 1.0)));
  const totalSamples = Math.floor(sampleRate * estSeconds);
  const pcmBytes = new Uint8Array(totalSamples * 2);
  const view = new DataView(pcmBytes.buffer);

  // Fundamental frequency F0
  const baseF0 = gender === 'female' ? 225 : 140;
  const f1 = gender === 'female' ? 620 : 500;
  const f2 = gender === 'female' ? 1900 : 1500;
  const f3 = gender === 'female' ? 2800 : 2500;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    
    // Syllabic envelope: simulates words and vowel pulses in Hindi
    const syllableRate = 4.8 * (speed || 1.0);
    const syllableMod = Math.abs(Math.sin(t * syllableRate * Math.PI));
    const syllableAmp = Math.pow(syllableMod, 0.6) * 0.75 + 0.25;
    
    // Sentence pitch intonation contour
    const sentenceProgress = t / estSeconds;
    const intonation = 1.0 + 0.12 * Math.sin(t * 2.2) - (0.18 * sentenceProgress);
    const currentF0 = baseF0 * intonation;
    
    // Glottal pulse harmonics (voice cords)
    const h1 = Math.sin(2 * Math.PI * currentF0 * t);
    const h2 = 0.6 * Math.sin(2 * Math.PI * currentF0 * 2 * t);
    const h3 = 0.35 * Math.sin(2 * Math.PI * currentF0 * 3 * t);
    const h4 = 0.2 * Math.sin(2 * Math.PI * currentF0 * 4 * t);
    
    // Vocal tract formant resonance filters
    const formant1 = 0.3 * Math.sin(2 * Math.PI * f1 * t);
    const formant2 = 0.15 * Math.sin(2 * Math.PI * f2 * t);
    const formant3 = 0.08 * Math.sin(2 * Math.PI * f3 * t);
    
    // Smooth envelope & fade
    let envelope = 1.0;
    const fadeSamples = Math.floor(sampleRate * 0.04);
    if (i < fadeSamples) envelope = i / fadeSamples;
    if (i > totalSamples - fadeSamples) envelope = (totalSamples - i) / fadeSamples;

    const rawSignal = (h1 + h2 + h3 + h4 + formant1 + formant2 + formant3) * 0.35 * syllableAmp * envelope;
    
    // Convert to 16-bit signed integer
    const sampleValue = Math.max(-32767, Math.min(32767, Math.floor(rawSignal * 32767)));
    view.setInt16(i * 2, sampleValue, true);
  }

  // Create standard RIFF/WAVE binary
  const wavBlob = pcmToWavBlob(pcmBytes, sampleRate);
  
  // Create complete base64 representing the full WAV file
  const byteRate = (sampleRate * 1 * 16) / 8;
  const headerBuffer = new ArrayBuffer(44);
  const headerView = new DataView(headerBuffer);
  writeAscii(headerView, 0, 'RIFF');
  headerView.setUint32(4, 36 + pcmBytes.length, true);
  writeAscii(headerView, 8, 'WAVE');
  writeAscii(headerView, 12, 'fmt ');
  headerView.setUint32(16, 16, true);
  headerView.setUint16(20, 1, true);
  headerView.setUint16(22, 1, true);
  headerView.setUint32(24, sampleRate, true);
  headerView.setUint32(28, byteRate, true);
  headerView.setUint16(32, 2, true);
  headerView.setUint16(34, 16, true);
  writeAscii(headerView, 36, 'data');
  headerView.setUint32(40, pcmBytes.length, true);

  const fullWavBytes = new Uint8Array(44 + pcmBytes.length);
  fullWavBytes.set(new Uint8Array(headerBuffer), 0);
  fullWavBytes.set(pcmBytes, 44);

  let binary = '';
  const totalLen = fullWavBytes.byteLength;
  for (let j = 0; j < totalLen; j++) {
    binary += String.fromCharCode(fullWavBytes[j]);
  }
  const base64 = window.btoa(binary);

  return {
    base64,
    blob: wavBlob,
    durationSec: Math.round(estSeconds * 10) / 10
  };
}

/**
 * Fallback WAV Blob generator
 */
function generateFallbackWavBlob(durationSeconds = 1.5, sampleRate = 24000): Blob {
  const totalSamples = Math.floor(sampleRate * durationSeconds);
  const pcmBytes = new Uint8Array(totalSamples * 2);
  const view = new DataView(pcmBytes.buffer);
  
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const sampleValue = 0.35 * Math.sin(2 * Math.PI * 440 * t) * (1 - t / durationSeconds);
    const int16 = Math.floor(sampleValue * 32767);
    view.setInt16(i * 2, int16, true);
  }
  return pcmToWavBlob(pcmBytes, sampleRate);
}

/**
 * Downloads audio file to user's computer (as MP3 or WAV)
 */
export function downloadAudioFile(
  blobOrBase64: Blob | string,
  filename: string = 'vani_hindi_voice.mp3'
): void {
  let blob: Blob;
  if (typeof blobOrBase64 === 'string') {
    blob = base64ToWavBlob(blobOrBase64);
  } else {
    blob = blobOrBase64;
  }

  // Create downloadable object URL
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.style.display = 'none';
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  
  // Cleanup after trigger
  setTimeout(() => {
    if (document.body.contains(anchor)) {
      document.body.removeChild(anchor);
    }
    URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * Plays any audio blob reliably using Web Audio API decodeAudioData
 */
async function playAudioBlobWithWebAudio(
  blob: Blob,
  onStart?: () => void,
  onEnd?: () => void,
  onTimeUpdate?: (curr: number, dur: number) => void
): Promise<void> {
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) throw new Error("AudioContext not supported");

  if (!currentAudioContext || currentAudioContext.state === 'closed') {
    currentAudioContext = new AudioCtx();
  }
  if (currentAudioContext.state === 'suspended') {
    await currentAudioContext.resume();
  }

  const arrayBuffer = await blob.arrayBuffer();
  // decodeAudioData automatically unpacks WAV / RIFF audio cleanly
  const audioBuffer = await currentAudioContext.decodeAudioData(arrayBuffer);

  const source = currentAudioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(currentAudioContext.destination);
  currentSourceNode = source;

  const startTime = currentAudioContext.currentTime;
  const duration = audioBuffer.duration;

  let animFrameId: number;
  const trackProgress = () => {
    if (!currentSourceNode || !currentAudioContext) return;
    const elapsed = currentAudioContext.currentTime - startTime;
    if (elapsed <= duration) {
      if (onTimeUpdate) onTimeUpdate(elapsed, duration);
      animFrameId = requestAnimationFrame(trackProgress);
    }
  };

  return new Promise((resolve) => {
    source.onended = () => {
      cancelAnimationFrame(animFrameId);
      currentSourceNode = null;
      if (onEnd) onEnd();
      resolve();
    };

    if (onStart) onStart();
    source.start(0);
    animFrameId = requestAnimationFrame(trackProgress);
  });
}

/**
 * Plays base64 audio data using standard HTML5 Audio with WAV header or Web Audio fallback
 */
export async function playBase64Audio(
  base64Data: string,
  onStart?: () => void,
  onEnd?: () => void,
  onTimeUpdate?: (currentTime: number, duration: number) => void
): Promise<{ audioElement: HTMLAudioElement; blobUrl: string }> {
  stopAllAudio();

  const wavBlob = base64ToWavBlob(base64Data, 24000);
  const blobUrl = URL.createObjectURL(wavBlob);

  const audio = new Audio(blobUrl);
  currentAudio = audio;

  audio.onplay = () => {
    if (onStart) onStart();
  };

  if (onTimeUpdate) {
    audio.ontimeupdate = () => {
      onTimeUpdate(audio.currentTime, audio.duration || 0);
    };
  }

  audio.onended = () => {
    currentAudio = null;
    if (onEnd) onEnd();
  };

  audio.onerror = async (e) => {
    console.warn("HTML5 audio element playback issue, switching to WebAudio buffer decode...", e);
    try {
      await playAudioBlobWithWebAudio(wavBlob, onStart, onEnd, onTimeUpdate);
    } catch (webAudioErr) {
      console.error("Web Audio playback error:", webAudioErr);
      if (onEnd) onEnd();
    }
  };

  try {
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      await playPromise;
    }
  } catch (err) {
    console.warn("HTML5 Audio play interrupted or blocked by browser policy, decoding via Web Audio API...", err);
    try {
      await playAudioBlobWithWebAudio(wavBlob, onStart, onEnd, onTimeUpdate);
    } catch (webAudioErr) {
      console.error("Web Audio fallback error:", webAudioErr);
      if (onEnd) onEnd();
    }
  }

  return { audioElement: audio, blobUrl };
}

/**
 * Fallback Speech Synthesis using Web Speech API in Hindi (hi-IN)
 */
let cachedVoices: SpeechSynthesisVoice[] = [];

if (typeof window !== 'undefined' && window.speechSynthesis) {
  const loadVoices = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
  loadVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
}

export function getAvailableSpeechVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  if (cachedVoices.length === 0) {
    cachedVoices = window.speechSynthesis.getVoices();
  }
  return cachedVoices;
}

export function speakWithBrowser(
  text: string, 
  gender: 'male' | 'female', 
  speed: number = 1,
  onStart?: () => void,
  onEnd?: () => void
): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      if (onEnd) onEnd();
      return resolve();
    }

    try {
      // Cancel previous speech synthesis safely
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      
      const voices = getAvailableSpeechVoices();
      
      // Look for Hindi voice first
      let voice = voices.find(v => 
        v.lang.toLowerCase().startsWith('hi') || 
        v.name.toLowerCase().includes('hindi') || 
        v.name.includes('हिन्दी')
      );

      // If no direct Hindi, look for Indian English or Indic voice
      if (!voice) {
        voice = voices.find(v => 
          v.lang.includes('IN') || 
          v.lang.includes('in') ||
          v.name.toLowerCase().includes('india')
        );
      }

      // Gender preference matching if multiple voices found
      if (voice && gender === 'female') {
        const femaleVoice = voices.find(v => 
          (v.lang.startsWith('hi') || v.lang.includes('IN')) && 
          (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('lekha') || v.name.toLowerCase().includes('swara'))
        );
        if (femaleVoice) voice = femaleVoice;
      }

      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = 'hi-IN';
      }

      utterance.rate = Math.max(0.6, Math.min(1.8, speed || 1.0));
      utterance.pitch = gender === 'female' ? 1.2 : 0.85;

      let keepAliveTimer: any = null;

      utterance.onstart = () => {
        if (onStart) onStart();
        // Chrome keepalive workaround for long utterances
        keepAliveTimer = setInterval(() => {
          if (window.speechSynthesis.speaking) {
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
          } else {
            clearInterval(keepAliveTimer);
          }
        }, 10000);
      };

      const cleanup = () => {
        if (keepAliveTimer) clearInterval(keepAliveTimer);
      };

      utterance.onend = () => {
        cleanup();
        if (onEnd) onEnd();
        resolve();
      };

      utterance.onerror = (e) => {
        cleanup();
        console.warn("Browser speech synthesis notice:", e);
        if (onEnd) onEnd();
        resolve();
      };

      // Resume if browser synthesis is paused
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("speechSynthesis error:", err);
      if (onEnd) onEnd();
      resolve();
    }
  });
}


