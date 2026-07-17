/**
 * Audio Utilities for Speech Synthesis & Voice Playback
 */

let currentAudio: HTMLAudioElement | null = null;

/**
 * Stops any currently playing audio element or browser speech synthesis
 */
export function stopAllAudio(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Plays a base64 encoded audio string returned by the server
 * @param base64Data Base64 encoded audio bytes
 * @returns Promise that resolves when audio finishes playing
 */
export function playBase64Audio(base64Data: string, onStart?: () => void, onEnd?: () => void): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      stopAllAudio();

      // Convert base64 to binary array
      const binaryString = window.atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Create a Blob from the raw bytes (Vast majority of browser players handle raw audio/mp3/wav/ogg streams)
      // Gemini TTS usually returns a valid WAV or high-quality container stream.
      // If container-less, we'll try standard audio/wav or audio/mp3.
      const blob = new Blob([bytes], { type: 'audio/mp3' });
      const audioUrl = URL.createObjectURL(blob);
      
      const audio = new Audio(audioUrl);
      currentAudio = audio;

      audio.onplay = () => {
        if (onStart) onStart();
      };

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        currentAudio = null;
        if (onEnd) onEnd();
        resolve();
      };

      audio.onerror = (e) => {
        URL.revokeObjectURL(audioUrl);
        currentAudio = null;
        console.error("Audio playback error, trying audio/wav fallback...", e);
        
        // Let's try to load it as audio/wav
        const wavBlob = new Blob([bytes], { type: 'audio/wav' });
        const wavUrl = URL.createObjectURL(wavBlob);
        const fallbackAudio = new Audio(wavUrl);
        currentAudio = fallbackAudio;
        
        fallbackAudio.onplay = () => {
          if (onStart) onStart();
        };
        fallbackAudio.onended = () => {
          URL.revokeObjectURL(wavUrl);
          currentAudio = null;
          if (onEnd) onEnd();
          resolve();
        };
        fallbackAudio.onerror = (err) => {
          URL.revokeObjectURL(wavUrl);
          currentAudio = null;
          reject(err);
        };
        
        fallbackAudio.play().catch(reject);
      };

      audio.play().catch((err) => {
        console.error("Playback play() failed:", err);
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Fallback Speech Synthesis using Web Speech API in Hindi (hi-IN)
 */
export function speakWithBrowser(
  text: string, 
  gender: 'male' | 'female', 
  speed: number = 1,
  onStart?: () => void,
  onEnd?: () => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return reject(new Error("Web Speech Synthesis not supported in this browser."));
    }

    stopAllAudio();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Attempt to select a native Hindi (hi-IN) voice
    const voices = window.speechSynthesis.getVoices();
    let hindiVoice = voices.find(v => v.lang.startsWith('hi') || v.lang.includes('IN'));
    
    // If no explicit Hindi voice, look for common Indic region codes or any female/male fallback
    if (!hindiVoice) {
      hindiVoice = voices.find(v => v.lang.includes('IN'));
    }

    if (hindiVoice) {
      utterance.voice = hindiVoice;
    }

    // Set voice options
    utterance.lang = 'hi-IN';
    utterance.rate = speed;
    utterance.pitch = gender === 'female' ? 1.1 : 0.85;

    utterance.onstart = () => {
      if (onStart) onStart();
    };

    utterance.onend = () => {
      if (onEnd) onEnd();
      resolve();
    };

    utterance.onerror = (e) => {
      console.error("Browser speech synthesis error:", e);
      if (onEnd) onEnd();
      reject(e);
    };

    window.speechSynthesis.speak(utterance);
  });
}
