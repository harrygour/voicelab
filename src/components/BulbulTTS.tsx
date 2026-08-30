import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Square, Sparkles, Volume2, VolumeX, Download, Copy, Check, RotateCcw, FileAudio, Radio, Music, AlertTriangle, ShieldCheck } from 'lucide-react';
import { HINDI_VOICES, TTS_PRESETS } from '../data';
import { VoiceCharacter, TTSHistoryItem } from '../types';
import { playBase64Audio, speakWithBrowser, stopAllAudio, downloadAudioFile, base64ToWavBlob, generateSpeechWav } from '../utils/audio';

interface BulbulTTSProps {
  apiKeyValid: boolean | null;
  onAddHistory: (item: TTSHistoryItem) => void;
}

interface GeneratedAudioData {
  base64: string;
  blobUrl?: string;
  text: string;
  voiceName: string;
  voiceHindiName: string;
  gender: 'male' | 'female';
  timestamp: string;
  durationSec: number;
}

export default function BulbulTTS({ apiKeyValid, onAddHistory }: BulbulTTSProps) {
  const [inputText, setInputText] = useState(TTS_PRESETS[0].text);
  const [selectedVoice, setSelectedVoice] = useState<VoiceCharacter>(HINDI_VOICES[1]); // Default Ananya
  const [speed, setSpeed] = useState<number>(1.0);
  const [emotion, setEmotion] = useState<string>('Polite');
  
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [quotaReached, setQuotaReached] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Audio Preview & Download State
  const [generatedAudio, setGeneratedAudio] = useState<GeneratedAudioData | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const playbackIntervalRef = useRef<any>(null);

  // 1000 Words limit calculations
  const MAX_WORDS = 1000;
  const wordsArray = inputText.trim() ? inputText.trim().split(/\s+/).filter(Boolean) : [];
  const wordsCount = wordsArray.length;
  const isOverWordLimit = wordsCount > MAX_WORDS;

  const applyPreset = (presetText: string, voiceId: string, emotionStr: string) => {
    setInputText(presetText);
    const matchedVoice = HINDI_VOICES.find(v => v.id === voiceId);
    if (matchedVoice) setSelectedVoice(matchedVoice);
    setEmotion(emotionStr);
  };

  const handleSpeak = async () => {
    if (!inputText.trim()) return;

    if (isOverWordLimit) {
      setErrorMessage(`टेक्स्ट में ${wordsCount} शब्द हैं। अधिकतम सीमा ${MAX_WORDS} शब्द (Words) है। कृपया टेक्स्ट थोड़ा कम करें।`);
      return;
    }
    
    setIsSynthesizing(true);
    setErrorMessage(null);
    stopAllAudio();
    if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
    setIsPlaying(false);
    setCurrentTime(0);

    try {
      // Call server TTS endpoint with 20s timeout (handles up to 1000 words in sentence chunks)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText.trim(),
          voiceName: selectedVoice.prebuiltVoice,
          gender: selectedVoice.gender,
          speed
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.audio) {
        setIsSynthesizing(false);
        
        // Estimate natural duration (~3 words per second)
        const estDuration = Math.max(3, Math.round(wordsCount / 2.8));
        setDuration(estDuration);

        const audioRecord: GeneratedAudioData = {
          base64: data.audio,
          text: inputText,
          voiceName: selectedVoice.name,
          voiceHindiName: selectedVoice.hindiName,
          gender: selectedVoice.gender,
          timestamp: new Date().toLocaleTimeString(),
          durationSec: estDuration
        };
        setGeneratedAudio(audioRecord);

        // Add to History logs with base64 for instant re-play and download
        onAddHistory({
          id: 'tts_' + Date.now(),
          text: inputText.substring(0, 80) + (inputText.length > 80 ? '...' : ''),
          voiceName: `${selectedVoice.name} (${selectedVoice.hindiName})`,
          gender: selectedVoice.gender,
          timestamp: new Date().toLocaleTimeString(),
          audioBase64: data.audio,
          duration: `${Math.floor(estDuration / 60)}:${(estDuration % 60).toString().padStart(2, '0')}`
        });

        // Play with real voice audio engine
        await playAudioRecord(data.audio);
        return;
      } else {
        throw new Error(data.error || "Server speech synthesis failed.");
      }

    } catch (error: any) {
      console.warn("Server TTS redirected to browser native speech synthesis:", error?.message || error);
      // Seamless browser speech synthesis fallback
      await handleBrowserFallback();
    } finally {
      setIsSynthesizing(false);
    }
  };

  const playAudioRecord = async (base64Data: string) => {
    try {
      setIsPlaying(true);
      const { audioElement, blobUrl } = await playBase64Audio(
        base64Data,
        () => {
          setIsPlaying(true);
        },
        () => {
          setIsPlaying(false);
          setCurrentTime(0);
        },
        (curr, dur) => {
          setCurrentTime(curr);
          if (dur && !isNaN(dur) && dur > 0) {
            setDuration(dur);
          }
        }
      );
      activeAudioRef.current = audioElement;
      audioElement.playbackRate = speed;
      audioElement.muted = isMuted;

      setGeneratedAudio(prev => prev ? { ...prev, blobUrl } : null);
    } catch (err) {
      console.error("Playback error:", err);
      setIsPlaying(false);
    }
  };

  const handleBrowserFallback = async () => {
    try {
      setIsSynthesizing(false);
      setIsPlaying(true);
      
      const estDuration = Math.max(3, Math.round(wordsCount / 2.8));
      setDuration(estDuration);

      // Progress tracker for playback
      let elapsed = 0;
      if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = setInterval(() => {
        elapsed += 0.2;
        setCurrentTime(Math.min(estDuration, elapsed));
        if (elapsed >= estDuration) {
          if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
        }
      }, 200);

      // Speak directly and clearly using browser SpeechSynthesis
      await speakWithBrowser(
        inputText, 
        selectedVoice.gender, 
        speed,
        () => {
          setIsPlaying(true);
        },
        () => {
          if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
          setIsPlaying(false);
          setCurrentTime(0);
        }
      );
    } catch (err: any) {
      console.error("Browser Fallback Error:", err);
      if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
      setIsPlaying(false);
    }
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      handleStop();
    } else if (generatedAudio?.base64) {
      playAudioRecord(generatedAudio.base64);
    } else if (inputText.trim()) {
      handleSpeak();
    }
  };

  const handleStop = () => {
    stopAllAudio();
    if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
    setIsPlaying(false);
    setIsSynthesizing(false);
    setCurrentTime(0);
  };

  const handleDownload = async (format: 'mp3' | 'wav') => {
    let audioBase64ToDownload = generatedAudio?.base64;

    // If audio is not yet generated, generate it first
    if (!audioBase64ToDownload) {
      if (!inputText.trim()) return;
      setIsSynthesizing(true);
      try {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: inputText.trim(),
            voiceName: selectedVoice.prebuiltVoice
          })
        });
        const data = await response.json().catch(() => ({}));
        if (data.audio) {
          audioBase64ToDownload = data.audio;
          setGeneratedAudio({
            base64: data.audio,
            text: inputText,
            voiceName: selectedVoice.name,
            voiceHindiName: selectedVoice.hindiName,
            gender: selectedVoice.gender,
            timestamp: new Date().toLocaleTimeString(),
            durationSec: Math.max(3, Math.round(wordsCount / 2.8))
          });
        }
      } catch (e) {
        console.error("Download audio generation failed:", e);
      } finally {
        setIsSynthesizing(false);
      }
    }

    if (!audioBase64ToDownload) {
      setErrorMessage("ऑडियो डाउनलोड के लिए तैयार नहीं है। कृपया 'आवाज़ बनाएँ' बटन दबाएँ।");
      return;
    }

    const safeVoiceName = selectedVoice.name.toLowerCase();
    const filename = `vani_ai_${safeVoiceName}_hindi_${Date.now()}.${format}`;

    downloadAudioFile(audioBase64ToDownload, filename);
    setDownloadSuccess(`Downloaded as ${format.toUpperCase()} (असली हिंदी आवाज़)!`);
    setTimeout(() => setDownloadSuccess(null), 3500);
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(inputText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (activeAudioRef.current) {
      activeAudioRef.current.currentTime = newTime;
    }
  };

  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (activeAudioRef.current) {
      activeAudioRef.current.muted = nextMute;
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div id="bulbul-tts-panel" className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 md:p-6 shadow-2xl relative overflow-hidden">
      
      {/* Dynamic glow effect background */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Quota Limit Resilience Banner */}
      {quotaReached && (
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between gap-3 text-amber-200">
          <div className="flex items-center gap-2 text-xs">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Vani Native Voice Engine Active</strong> (Gemini TTS 429 Quota Exceeded). स्पीच प्लेबैक, प्रीव्यू और MP3 डाउनलोड बिना किसी रुकावट के लगातार चालू हैं!
            </span>
          </div>
          <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono px-2 py-0.5 rounded border border-amber-500/30 shrink-0">
            Auto Fallback
          </span>
        </div>
      )}

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 mb-6 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Volume2 className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-sans font-bold text-lg text-white flex items-center gap-2">
                वाणी बुलबुल 
                <span className="text-slate-400 font-normal text-sm">(Vani Bulbul TTS)</span>
                <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full font-mono border border-emerald-500/20">HD 24kHz</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">अत्यधिक प्राकृतिक हिंदी आवाज़ जनरेटर और MP3 डाउनलोडर</p>
            </div>
          </div>
        </div>
        
        {/* Toggle between Web Speech API and Server Gemini Speech Model */}
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
          <span className="text-[10px] font-mono text-slate-400">ENGINE:</span>
          <button 
            onClick={() => { setUseFallback(false); setQuotaReached(false); }}
            disabled={!apiKeyValid}
            className={`text-xs px-2.5 py-1 rounded-lg transition-all duration-200 ${!useFallback && apiKeyValid ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/40 shadow-sm' : 'text-slate-500 hover:text-slate-300 disabled:opacity-40'}`}
          >
            Gemini TTS (AI)
          </button>
          <button 
            onClick={() => setUseFallback(true)}
            className={`text-xs px-2.5 py-1 rounded-lg transition-all duration-200 ${useFallback ? 'bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/40' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Vani Native Voice
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Control Panel (Options) */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* Preset Buttons */}
          <div>
            <label className="text-xs font-mono font-bold tracking-wider text-slate-400 uppercase block mb-2">
              Select Preset Scenario (उदाहरण)
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {TTS_PRESETS.map((preset, index) => (
                <button
                  key={index}
                  onClick={() => applyPreset(preset.text, preset.voiceId, preset.emotion)}
                  className="w-full text-left text-xs bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/30 p-2.5 rounded-xl transition-all duration-200 group flex items-center justify-between"
                >
                  <span className="text-slate-300 font-medium group-hover:text-white truncate">{preset.label}</span>
                  <Sparkles className="w-3 h-3 text-amber-500 opacity-60 group-hover:opacity-100 transition-opacity shrink-0 ml-1" />
                </button>
              ))}
            </div>
          </div>

          {/* Voice selector */}
          <div>
            <label className="text-xs font-mono font-bold tracking-wider text-slate-400 uppercase block mb-2">
              Select Hindi Voice Actor (हिंदी आवाज़)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {HINDI_VOICES.map((voice) => (
                <button
                  key={voice.id}
                  onClick={() => setSelectedVoice(voice)}
                  className={`border p-2.5 rounded-xl text-left transition-all duration-200 ${selectedVoice.id === voice.id ? 'bg-gradient-to-br from-slate-900 to-slate-800 border-amber-500 shadow-md shadow-amber-500/10' : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-white leading-tight">{voice.name}</span>
                    <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-mono">
                      {voice.gender === 'female' ? 'महिला' : 'पुरुष'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-amber-400 font-sans">{voice.hindiName}</span>
                    <span className="text-[9px] text-slate-500 font-mono">{voice.prebuiltVoice}</span>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-2 bg-slate-950/40 border border-slate-800/80 p-2.5 rounded-xl italic leading-relaxed">
              {selectedVoice.desc}
            </p>
          </div>

          {/* Speech Pitch & Tuning */}
          <div className="space-y-3 bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/60">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs text-slate-400 font-mono">Voice Speed (गति):</span>
                <span className="text-xs font-mono text-amber-400 font-bold">{speed.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded cursor-pointer"
              />
            </div>

            <div>
              <span className="text-xs text-slate-400 font-mono block mb-1.5">Tone Mood (भाव):</span>
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
            <div className="flex items-center justify-between gap-2 px-1 mb-2">
              <span className="text-xs font-mono text-slate-400 font-bold uppercase">
                Input Text (टेक्स्ट लिखें)
              </span>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-mono px-2.5 py-1 rounded-lg border font-bold ${isOverWordLimit ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse' : wordsCount > 800 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-slate-950 text-slate-300 border-slate-800'}`}>
                  {wordsCount} / {MAX_WORDS} शब्द (Words)
                </span>
                <span className="text-[10px] text-slate-500 font-mono hidden sm:inline-block">
                  ({inputText.length} अक्षर)
                </span>
              </div>
            </div>
            
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="यहाँ 1 से लेकर 1000 शब्दों तक का कोई भी हिंदी या हिंग्लिश टेक्स्ट लिखें जिसे आप आवाज़ में बदलना चाहते हैं..."
              className={`w-full h-56 bg-slate-950/80 text-white rounded-xl border p-4 text-base leading-relaxed resize-none font-sans transition-colors ${isOverWordLimit ? 'border-rose-500 focus:ring-1 focus:ring-rose-500' : 'border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500'}`}
            />
            {isOverWordLimit && (
              <div className="mt-1 text-xs text-rose-400 font-medium flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                शब्द सीमा (1000 शब्द) से अधिक हो गई है। कृपया {wordsCount - MAX_WORDS} शब्द कम करें।
              </div>
            )}
          </div>

          {/* Audio Preview & Download Player Deck */}
          {generatedAudio && (
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-4 rounded-2xl border border-amber-500/30 shadow-lg space-y-3">
              
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  <span className="text-xs font-bold text-white font-sans">
                    {generatedAudio.voiceName} ({generatedAudio.voiceHindiName})
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                    Generated at {generatedAudio.timestamp}
                  </span>
                </div>

                {/* Direct Download Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownload('mp3')}
                    title="Download as MP3 file"
                    className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-md shadow-amber-500/10 transition-all active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download MP3 (एमपी3)
                  </button>

                  <button
                    onClick={() => handleDownload('wav')}
                    title="Download as WAV file"
                    className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 transition-all"
                  >
                    <FileAudio className="w-3.5 h-3.5 text-indigo-400" />
                    WAV
                  </button>
                  
                  <button
                    onClick={handleCopyText}
                    title="Copy Text"
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all"
                  >
                    {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Player Controls & Scrubber */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                
                {/* Play/Pause Button */}
                <button
                  onClick={handleTogglePlay}
                  className="w-10 h-10 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-md transition-all active:scale-90 shrink-0"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-slate-950" />
                  ) : (
                    <Play className="w-5 h-5 fill-slate-950 ml-0.5" />
                  )}
                </button>

                {/* Scrubber & Visualizer */}
                <div className="flex-1 w-full space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>{formatTime(currentTime)}</span>
                    
                    {/* Animated Equalizer Waves */}
                    <div className="flex items-end gap-0.5 h-3">
                      {[40, 75, 30, 90, 60, 100, 45, 80, 50, 95, 35, 70].map((h, i) => (
                        <span 
                          key={i}
                          style={{ height: isPlaying ? `${h}%` : '20%' }}
                          className={`w-0.5 rounded-full transition-all duration-150 ${isPlaying ? 'bg-amber-400' : 'bg-slate-700'}`}
                        />
                      ))}
                    </div>

                    <span>{formatTime(duration || generatedAudio.durationSec || 5)}</span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max={duration || generatedAudio.durationSec || 5}
                    step="0.01"
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded cursor-pointer"
                  />
                </div>

                {/* Mute button */}
                <button
                  onClick={handleToggleMute}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all shrink-0"
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
                </button>

              </div>

              {downloadSuccess && (
                <div className="text-emerald-400 text-xs font-mono text-center bg-emerald-500/10 py-1 rounded border border-emerald-500/20 animate-fade-in">
                  ✓ {downloadSuccess}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons & Status */}
          <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3">
            
            {/* Playback animation or status */}
            <div className="flex items-center gap-3">
              {isSynthesizing ? (
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    <span className="w-1.5 h-4 bg-amber-400 rounded animate-bounce [animation-delay:0.1s]"></span>
                    <span className="w-1.5 h-4 bg-rose-500 rounded animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-4 bg-amber-400 rounded animate-bounce [animation-delay:0.3s]"></span>
                  </div>
                  <span className="text-xs text-amber-400 font-mono">Generating HD Hindi voice preview...</span>
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
                  <Radio className="w-4 h-4 text-amber-500/70" />
                  <span className="text-xs font-mono">Ready to generate Hindi voice</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {isPlaying || isSynthesizing ? (
                <button
                  onClick={handleStop}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                >
                  <Square className="w-4 h-4 fill-white" />
                  Stop (रोकें)
                </button>
              ) : (
                <button
                  onClick={handleSpeak}
                  disabled={!inputText.trim()}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-amber-500/15 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Play className="w-4 h-4 fill-white animate-pulse" />
                  Generate & Preview Voice (आवाज़ बनाएँ)
                </button>
              )}
            </div>

          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
              {errorMessage}
            </div>
          )}

        </div>

      </div>

    </div>
  );
}

