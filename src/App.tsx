import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import BulbulTTS from './components/BulbulTTS';
import ShravanSTT from './components/ShravanSTT';
import AnvaadTranslate from './components/AnvaadTranslate';
import MayuraChat from './components/MayuraChat';
import HistoryPanel from './components/HistoryPanel';
import { TTSHistoryItem, STTResult } from './types';
import { speakWithBrowser, playBase64Audio, stopAllAudio } from './utils/audio';
import { Volume2, Sparkles, Mic, HelpCircle, ArrowRight, Zap, Globe, Heart } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'tts' | 'stt' | 'translate' | 'chat'>('tts');
  const [apiKeyValid, setApiKeyValid] = useState<boolean | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [ttsHistory, setTtsHistory] = useState<TTSHistoryItem[]>([]);
  const [sttResults, setSttResults] = useState<STTResult[]>([]);

  // Check backend & API key status on mount
  const checkStatus = async () => {
    setCheckingStatus(true);
    try {
      // Send a minimal request to translate to check API status
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'Hi',
          sourceLang: 'en',
          targetLang: 'hi'
        })
      });

      if (response.ok) {
        setApiKeyValid(true);
      } else {
        setApiKeyValid(false);
      }
    } catch (e) {
      console.warn("Backend or API Key check failed, falling back to local speech synthesis.", e);
      setApiKeyValid(false);
    } finally {
      setCheckingStatus(false);
    }
  };

  useEffect(() => {
    checkStatus();

    // Load initial history from localStorage if any
    const localTts = localStorage.getItem('sarvam_tts_history');
    if (localTts) {
      try {
        setTtsHistory(JSON.parse(localTts));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleAddTtsHistory = (newItem: TTSHistoryItem) => {
    setTtsHistory(prev => {
      const updated = [newItem, ...prev].slice(0, 50); // Keep last 50
      localStorage.setItem('sarvam_tts_history', JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearHistory = () => {
    setTtsHistory([]);
    localStorage.removeItem('sarvam_tts_history');
  };

  const handlePlayHistoryItem = async (text: string, gender: 'male' | 'female') => {
    stopAllAudio();
    try {
      if (apiKeyValid) {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: text,
            voiceName: gender === 'female' ? 'Kore' : 'Charon'
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.audio) {
            await playBase64Audio(data.audio);
            return;
          }
        }
      }
      
      // Fallback
      await speakWithBrowser(text, gender);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Sleek Top Navbar */}
      <Navbar 
        apiKeyValid={apiKeyValid} 
        checkingStatus={checkingStatus} 
        onRefreshStatus={checkStatus} 
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 space-y-8">
        
        {/* Dynamic Hero banner */}
        <section className="relative rounded-3xl bg-radial from-slate-900/90 to-slate-950 border border-slate-800 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden shadow-2xl">
          {/* Neon backglow lights */}
          <div className="absolute -left-20 -top-20 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl"></div>
          
          <div className="space-y-4 max-w-2xl relative z-10">
            <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 to-rose-500/20 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-mono font-medium uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              Revolutionizing Indic Voice AI
            </div>
            
            <h1 className="font-sans font-black text-3xl md:text-4xl text-white tracking-tight leading-tight">
              भारतीय आवाज़ की असीम शक्ति। <br />
              <span className="bg-gradient-to-r from-amber-400 via-rose-500 to-indigo-500 bg-clip-text text-transparent">
                Experience Advanced Hindi Voice AI
              </span>
            </h1>
            
            <p className="text-slate-400 text-sm md:text-base leading-relaxed">
              सरवम एआई (Sarvam AI) से प्रेरित होकर, यह मंच अत्याधुनिक हिंदी वॉयस मॉडल प्रस्तुत करता है। अब आप अत्यधिक प्राकृतिक लहजे में पाठ से आवाज़ बना सकते हैं, आवाज़ से पाठ रिकॉर्ड कर सकते हैं, अनुवाद कर सकते हैं, और बुद्धिमान वॉयस सहायक मयूरा से बात कर सकते हैं।
            </p>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs text-slate-400 font-mono">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Low Latency Synthesis</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-indigo-400" />
                <span>Cultural Context Adaptation</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-rose-500" />
                <span>Premium hi-IN Audio Inputs</span>
              </div>
            </div>
          </div>

          {/* Graphical Right Panel (Indic Visual Wave) */}
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 p-5 w-full md:w-80 space-y-4 shrink-0 relative z-10 shadow-lg">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wide">Live Telemetry Metrics</span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-mono">STABLE</span>
            </div>
            <div className="space-y-2.5">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Hindi Audio Synthesized</span>
                  <span className="text-white font-mono font-bold">128,450 clips</span>
                </div>
                <div className="w-full bg-slate-950 h-1.5 rounded overflow-hidden">
                  <div className="bg-gradient-to-r from-amber-500 to-rose-500 h-full w-[84%] rounded"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Mayura Conversational Streak</span>
                  <span className="text-white font-mono font-bold">99.8%</span>
                </div>
                <div className="w-full bg-slate-950 h-1.5 rounded overflow-hidden">
                  <div className="bg-gradient-to-r from-rose-500 to-indigo-500 h-full w-[99.8%] rounded"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Shravan Transcription Precision</span>
                  <span className="text-white font-mono font-bold">98.7%</span>
                </div>
                <div className="w-full bg-slate-950 h-1.5 rounded overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-500 to-amber-500 h-full w-[98.7%] rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Product Navigation tabs */}
        <section className="space-y-6">
          <div className="flex border-b border-slate-800 overflow-x-auto pb-px justify-start gap-1">
            <button
              onClick={() => setActiveTab('tts')}
              className={`text-sm py-3 px-5 font-sans font-bold border-b-2 transition-all shrink-0 ${
                activeTab === 'tts'
                  ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
              }`}
            >
              Bulbul (बुलबुल TTS)
            </button>
            <button
              onClick={() => setActiveTab('stt')}
              className={`text-sm py-3 px-5 font-sans font-bold border-b-2 transition-all shrink-0 ${
                activeTab === 'stt'
                  ? 'border-rose-500 text-rose-400 bg-rose-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
              }`}
            >
              Shravan (श्रवण STT)
            </button>
            <button
              onClick={() => setActiveTab('translate')}
              className={`text-sm py-3 px-5 font-sans font-bold border-b-2 transition-all shrink-0 ${
                activeTab === 'translate'
                  ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
              }`}
            >
              Anvaad (अनुवाद Translate)
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`text-sm py-3 px-5 font-sans font-bold border-b-2 transition-all shrink-0 ${
                activeTab === 'chat'
                  ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
              }`}
            >
              Mayura (मयूरा Voice Bot)
            </button>
          </div>

          {/* Render Active Component Tab */}
          <div className="min-h-[450px]">
            {activeTab === 'tts' && (
              <BulbulTTS 
                apiKeyValid={apiKeyValid} 
                onAddHistory={handleAddTtsHistory} 
              />
            )}
            {activeTab === 'stt' && (
              <ShravanSTT 
                apiKeyValid={apiKeyValid}
                onAddSTTResult={(res) => setSttResults(prev => [res, ...prev])}
              />
            )}
            {activeTab === 'translate' && (
              <AnvaadTranslate apiKeyValid={apiKeyValid} />
            )}
            {activeTab === 'chat' && (
              <MayuraChat apiKeyValid={apiKeyValid} />
            )}
          </div>
        </section>

        {/* Saved Items and logs */}
        <section className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          <HistoryPanel 
            ttsHistory={ttsHistory} 
            onClearHistory={handleClearHistory} 
            onPlayItem={handlePlayHistoryItem}
          />
        </section>

      </main>

      {/* Corporate inspired clean footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 mt-12 text-center text-xs text-slate-500 font-mono space-y-2">
        <div className="flex items-center justify-center gap-2">
          <span>© 2026 Sarvam AI Hindi Voice Platform Clone</span>
          <span>•</span>
          <span className="flex items-center gap-1">Made with <Heart className="w-3 h-3 text-rose-500 fill-rose-500" /> in India</span>
        </div>
        <p className="text-[10px] text-slate-600">Model accuracy is high but speech synthesis and transcribing depends on browser audio APIs and Gemini API key configuration.</p>
      </footer>

    </div>
  );
}
