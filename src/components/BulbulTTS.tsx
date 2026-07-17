import React, { useState } from 'react';
import { Play, Square, Sparkles, Volume2, HelpCircle, Save, Check, FileAudio } from 'lucide-react';
import { HINDI_VOICES, TTS_PRESETS } from '../data';
import { VoiceCharacter, TTSHistoryItem } from '../types';
import { playBase64Audio, speakWithBrowser, stopAllAudio } from '../utils/audio';

interface BulbulTTSProps {
  apiKeyValid: boolean | null;
  onAddHistory: (item: TTSHistoryItem) => void;
}

export default function BulbulTTS({ apiKeyValid, onAddHistory }: BulbulTTSProps) {
  const [inputText, setInputText] = useState(TTS_PRESETS[0].text);
  const [selectedVoice, setSelectedVoice] = useState<VoiceCharacter>(HINDI_VOICES[1]); // Default Ananya
  const [speed, setSpeed] = useState<number>(1.0);
  const [pitch, setPitch] = useState<'low' | 'medium' | 'high'>('medium');
  const [emotion, setEmotion] = useState<string>('Polite');
  
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const applyPreset = (presetText: string, voiceId: string, emotionStr: string) => {
    setInputText(presetText);
    const matchedVoice = HINDI_VOICES.find(v => v.id === voiceId);
    if (matchedVoice) setSelectedVoice(matchedVoice);
    setEmotion(emotionStr);
  };

  const handleSpeak = async () => {
    if (!inputText.trim()) return;
    
    setIsSynthesizing(true);
    setErrorMessage(null);
    stopAllAudio();

    try {
      // 1. First attempt: Call Gemini Server-Side TTS Route if we aren't forced to use browser speech synthesis
      if (apiKeyValid && !useFallback) {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: inputText,
            voiceName: selectedVoice.prebuiltVoice
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Server speech synthesis failed.");
        }

        const data = await response.json();
        
        if (data.audio) {
          setIsSynthesizing(false);
          setIsPlaying(true);
          
          await playBase64Audio(data.audio, 
            () => setIsPlaying(true), 
            () => setIsPlaying(false)
          );

          // Add to History logs
          onAddHistory({
            id: 'tts_' + Date.now(),
            text: inputText.substring(0, 80) + (inputText.length > 80 ? '...' : ''),
            voiceName: `${selectedVoice.name} (${selectedVoice.hindiName})`,
            gender: selectedVoice.gender,
            timestamp: new Date().toLocaleTimeString(),
            duration: '0:05'
          });
          return;
        }
      }
      
      // 2. Fallback attempt: Use browser's local speech synthesis
      await handleBrowserFallback();

    } catch (error: any) {
      console.warn("Gemini TTS failed, falling back to browser voice engine...", error);
      setUseFallback(true);
      await handleBrowserFallback();
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleBrowserFallback = async () => {
    try {
      setIsSynthesizing(false);
      setIsPlaying(true);
      
      // Web speech synthesis parameters
      const mappedSpeed = speed;
      
      await speakWithBrowser(inputText, selectedVoice.gender, mappedSpeed,
        () => setIsPlaying(true),
        () => {
          setIsPlaying(false);
        }
      );

      // Add to History logs
      onAddHistory({
        id: 'tts_' + Date.now(),
        text: inputText.substring(0, 80) + (inputText.length > 80 ? '...' : ''),
        voiceName: `${selectedVoice.name} (${selectedVoice.hindiName}) [Browser Voice]`,
        gender: selectedVoice.gender,
        timestamp: new Date().toLocaleTimeString(),
        duration: 'Native'
      });
    } catch (err: any) {
      console.error("Browser Speak Error:", err);
      setErrorMessage("दोनों क्लाउड और लोकल वॉयस इंजनों में समस्या आ रही है। कृपया सुनिश्चित करें कि आवाज़ की मात्रा चालू है।");
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    stopAllAudio();
    setIsPlaying(false);
    setIsSynthesizing(false);
  };

  return (
    <div id="bulbul-tts-panel" className="bg-slate-900/50 rounded-2xl border border-slate-800 p-5 md:p-6 shadow-xl relative overflow-hidden">
      
      {/* Dynamic glow effect background */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2 mb-6 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Volume2 className="w-5 h-5" />
            </span>
            <h2 className="font-sans font-bold text-lg text-white">बुलबुल <span className="text-slate-400 font-normal">(Bulbul TTS)</span></h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">उच्च-गुणवत्ता पाठ से प्राकृतिक हिंदी आवाज़ बनाएँ</p>
        </div>
        
        {/* Toggle between Web Speech API and Server Gemini Speech Model */}
        <div className="flex items-center gap-2 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
          <span className="text-[10px] font-mono text-slate-400">SPEECH SOURCE:</span>
          <button 
            onClick={() => setUseFallback(false)}
            disabled={!apiKeyValid}
            className={`text-xs px-2 py-1 rounded transition-all duration-200 ${!useFallback && apiKeyValid ? 'bg-amber-500/20 text-amber-400 font-semibold border border-amber-500/30' : 'text-slate-500 hover:text-slate-300 disabled:opacity-40'}`}
          >
            Gemini TTS
          </button>
          <button 
            onClick={() => setUseFallback(true)}
            className={`text-xs px-2 py-1 rounded transition-all duration-200 ${useFallback ? 'bg-indigo-500/20 text-indigo-400 font-semibold border border-indigo-500/30' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Local Voice
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Control Panel (Options) */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* Preset Buttons */}
          <div>
            <label className="text-xs font-mono font-bold tracking-wider text-slate-400 uppercase block mb-2">
              Select Preset Scenario
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {TTS_PRESETS.map((preset, index) => (
                <button
                  key={index}
                  onClick={() => applyPreset(preset.text, preset.voiceId, preset.emotion)}
                  className="w-full text-left text-xs bg-slate-950/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 p-2.5 rounded-lg transition-all duration-200 group flex items-center justify-between"
                >
                  <span className="text-slate-300 font-medium group-hover:text-white truncate">{preset.label}</span>
                  <Sparkles className="w-3 h-3 text-amber-500 opacity-60 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>

          {/* Voice selector */}
          <div>
            <label className="text-xs font-mono font-bold tracking-wider text-slate-400 uppercase block mb-2">
              Select Hindi Voice Actor
            </label>
            <div className="grid grid-cols-2 gap-2">
              {HINDI_VOICES.map((voice) => (
                <button
                  key={voice.id}
                  onClick={() => setSelectedVoice(voice)}
                  className={`border p-2.5 rounded-xl text-left transition-all duration-200 ${selectedVoice.id === voice.id ? 'bg-gradient-to-br from-slate-900 to-slate-800 border-amber-500 shadow-md shadow-amber-500/10' : 'bg-slate-950/30 border-slate-800 hover:border-slate-700'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-white leading-tight">{voice.name}</span>
                    <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-mono">
                      {voice.gender === 'female' ? 'महि' : 'पुरु'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-amber-400 font-sans">{voice.hindiName}</span>
                    <span className="text-[9px] text-slate-500 font-mono">{voice.prebuiltVoice}</span>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-2 bg-slate-950/40 border border-slate-800/80 p-2 rounded-lg italic leading-relaxed">
              {selectedVoice.desc}
            </p>
          </div>

          {/* Speech Pitch & Tuning */}
          <div className="space-y-3 bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/50">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-slate-400 font-mono">Speech Speed (गति):</span>
                <span className="text-xs font-mono text-amber-400 font-bold">{speed.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="w-full accent-amber-500 bg-slate-800 h-1 rounded"
              />
            </div>

            <div>
              <span className="text-xs text-slate-400 font-mono block mb-1">Emotional Mood (भाव):</span>
              <div className="flex flex-wrap gap-1">
                {['Neutral', 'Polite', 'Energetic', 'Formal', 'Storyteller'].map((m) => (
                  <button
                    key={m}
                    onClick={() => setEmotion(m)}
                    className={`text-[10px] px-2 py-1 rounded-md transition-colors ${emotion === m ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Right Input and Generation Playground */}
        <div className="lg:col-span-8 flex flex-col justify-between space-y-4">
          
          <div className="flex-1 relative">
            <span className="absolute right-3 top-2.5 text-[10px] text-slate-500 font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800/80">
              Hindi Script (देवनागरी) / Hinglish
            </span>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="यहाँ वह वाक्य टाइप करें जिसे आप आवाज़ में बदलना चाहते हैं..."
              className="w-full h-64 bg-slate-950/80 text-white rounded-xl border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 p-4 pt-10 text-base leading-relaxed resize-none font-sans"
            />
          </div>

          {/* Action Buttons & Waves */}
          <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3">
            
            {/* Playback animation or status */}
            <div className="flex items-center gap-3">
              {isSynthesizing ? (
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    <span className="w-1 h-4 bg-amber-400 rounded animate-bounce [animation-delay:0.1s]"></span>
                    <span className="w-1 h-4 bg-rose-500 rounded animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1 h-4 bg-amber-400 rounded animate-bounce [animation-delay:0.3s]"></span>
                  </div>
                  <span className="text-xs text-amber-400 font-mono">Synthesizing audio stream...</span>
                </div>
              ) : isPlaying ? (
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    <span className="w-1.5 h-5 bg-emerald-500 rounded animate-pulse"></span>
                    <span className="w-1.5 h-3 bg-emerald-500 rounded animate-pulse [animation-delay:0.1s]"></span>
                    <span className="w-1.5 h-6 bg-emerald-500 rounded animate-pulse [animation-delay:0.2s]"></span>
                  </div>
                  <span className="text-xs text-emerald-400 font-semibold">Playing `{selectedVoice.name}` voice...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-500">
                  <Volume2 className="w-4 h-4" />
                  <span className="text-xs font-mono">Ready to output Hindi speech</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {isPlaying || isSynthesizing ? (
                <button
                  onClick={handleStop}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all"
                >
                  <Square className="w-4 h-4 fill-white" />
                  Stop (रोकें)
                </button>
              ) : (
                <button
                  onClick={handleSpeak}
                  disabled={!inputText.trim()}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-amber-500/10 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Play className="w-4 h-4 fill-white animate-pulse" />
                  Generate & Speak (आवाज़ बनाएँ)
                </button>
              )}
            </div>

          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg">
              {errorMessage}
            </div>
          )}

          {useFallback && !apiKeyValid && (
            <div className="p-2 bg-slate-950 border border-amber-500/20 rounded-lg text-[11px] text-amber-400 leading-relaxed flex items-start gap-1.5">
              <span className="font-bold">💡 Note:</span>
              <span>Gemini API keys are currently waiting setup. We have enabled premium client-side Web Speech Hindi voice synthesis instantly, allowing full functionality!</span>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
