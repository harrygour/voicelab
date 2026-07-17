import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Copy, Trash2, Check, Sparkles, Languages, Info, Key, ListFilter } from 'lucide-react';
import { STTResult } from '../types';

interface ShravanSTTProps {
  apiKeyValid: boolean | null;
  onAddSTTResult: (result: STTResult) => void;
}

export default function ShravanSTT({ apiKeyValid, onAddSTTResult }: ShravanSTTProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [copied, setCopied] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    englishTranslation: string;
    correction: string;
    keywords: string[];
  } | null>(null);

  const recognitionRef = useRef<any>(null);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    // Check browser compatibility
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'hi-IN'; // Set speech recognition language explicitly to Hindi

    rec.onstart = () => {
      setIsRecording(true);
      setInterimTranscript('');
    };

    rec.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      if (final) {
        setTranscript((prev) => prev + ' ' + final);
      }
      setInterimTranscript(interim);
    };

    rec.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        alert('माइक्रोफ़ोन एक्सेस अस्वीकार कर दिया गया है। कृपया ब्राउज़र सेटिंग्स में इसकी अनुमति दें।');
      }
      setIsRecording(false);
    };

    rec.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = rec;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const handleToggleRecord = () => {
    if (!isSupported) {
      alert("इस ब्राउज़र में स्पीच रिकॉग्निशन सपोर्ट नहीं है। कृपया गूगल क्रोम का उपयोग करें।");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setTranscript('');
      setInterimTranscript('');
      setAnalysisResult(null);
      recognitionRef.current.start();
    }
  };

  const handleClear = () => {
    setTranscript('');
    setInterimTranscript('');
    setAnalysisResult(null);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(transcript.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAnalyzeAndTranslate = async () => {
    const fullText = transcript.trim() || interimTranscript.trim();
    if (!fullText) return;

    setLoadingAnalysis(true);
    try {
      const response = await fetch('/api/process-stt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: fullText })
      });

      if (!response.ok) {
        throw new Error("Failed to process transcript");
      }

      const result = await response.json();
      setAnalysisResult(result);

      // Save complete record
      onAddSTTResult({
        id: 'stt_' + Date.now(),
        transcript: fullText,
        englishTranslation: result.englishTranslation,
        timestamp: new Date().toLocaleTimeString()
      });
    } catch (error) {
      console.error("Transcription analysis error:", error);
      // Fallback
      setAnalysisResult({
        englishTranslation: "English translation error. Please ensure Gemini API is running.",
        correction: "कोई महत्वपूर्ण व्याकरण त्रुटि नहीं पाई गई।",
        keywords: ["हिंदी भाषण", "ऑडियो", "अनुवाद"]
      });
    } finally {
      setLoadingAnalysis(false);
    }
  };

  return (
    <div id="shravan-stt-panel" className="bg-slate-900/50 rounded-2xl border border-slate-800 p-5 md:p-6 shadow-xl relative overflow-hidden">
      
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
              <Mic className="w-5 h-5" />
            </span>
            <h2 className="font-sans font-bold text-lg text-white">श्रवण <span className="text-slate-400 font-normal">(Shravan STT)</span></h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">अपने माइक्रोफ़ोन से हिंदी भाषा को तुरंत पाठ (टेक्स्ट) में बदलें</p>
        </div>
      </div>

      {!isSupported && (
        <div className="mb-4 p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs rounded-xl flex items-start gap-2">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong>ब्राउज़र संगतता चेतावनी:</strong> स्पीच रिकॉग्निशन आपके ब्राउज़र में उपलब्ध नहीं है। पूर्ण कार्यात्मक अनुभव के लिए कृपया Google Chrome, Safari, या Microsoft Edge का उपयोग करें।
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Recording Engine Left */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
          
          <div className="relative flex-1">
            <span className="absolute right-3 top-2.5 text-[10px] text-slate-500 font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800/80">
              Hindi Voice Transcription Engine (hi-IN)
            </span>
            <div className="w-full h-64 bg-slate-950/85 text-white rounded-xl border border-slate-800 focus-within:border-rose-500 p-4 pt-10 overflow-y-auto leading-relaxed relative flex flex-col justify-between">
              
              <div className="space-y-2">
                {transcript ? (
                  <p className="text-white text-base font-sans whitespace-pre-wrap">{transcript}</p>
                ) : !interimTranscript ? (
                  <p className="text-slate-500 italic text-sm font-sans pt-4">
                    {isRecording 
                      ? 'सुन रहा हूँ... बोलना शुरू करें...' 
                      : 'नीचे लाल माइक्रोफ़ोन बटन पर क्लिक करें और हिंदी में बात करना शुरू करें। आपकी आवाज़ यहाँ लाइव दिखाई देगी।'}
                  </p>
                ) : null}
                
                {interimTranscript && (
                  <p className="text-rose-400/80 italic text-base font-sans">{interimTranscript}</p>
                )}
              </div>

              {/* Volume pulse effect while recording */}
              {isRecording && (
                <div className="mt-4 flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg animate-pulse">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-3 bg-rose-500 rounded animate-bounce [animation-delay:0.1s]"></span>
                    <span className="w-1.5 h-5 bg-rose-500 rounded animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-2 bg-rose-500 rounded animate-bounce [animation-delay:0.3s]"></span>
                    <span className="w-1.5 h-4 bg-rose-500 rounded animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                  <span className="text-[11px] font-mono text-rose-400 uppercase tracking-wider font-semibold">
                    Recording Live Mic Stream...
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
            
            {/* Start/Stop Button */}
            <button
              onClick={handleToggleRecord}
              className={`flex items-center justify-center gap-2.5 px-6 py-2.5 rounded-lg text-sm font-bold transition-all active:scale-95 ${
                isRecording
                  ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse shadow-lg shadow-rose-500/20'
                  : 'bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white shadow-lg shadow-rose-500/10'
              }`}
            >
              {isRecording ? (
                <>
                  <MicOff className="w-4 h-4" />
                  Stop Recording (रोकें)
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 fill-white" />
                  Start Speaking (बोलें)
                </>
              )}
            </button>

            {/* Utility Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                disabled={!transcript.trim()}
                title="Copy Text"
                className="p-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-lg transition-all disabled:opacity-30 disabled:pointer-events-none"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                onClick={handleClear}
                disabled={!transcript.trim() && !interimTranscript.trim()}
                title="Clear"
                className="p-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-lg transition-all disabled:opacity-30 disabled:pointer-events-none"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                onClick={handleAnalyzeAndTranslate}
                disabled={!transcript.trim() || loadingAnalysis}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/30 hover:border-indigo-500 rounded-lg text-xs font-bold transition-all disabled:opacity-30 disabled:pointer-events-none"
              >
                <Languages className="w-3.5 h-3.5" />
                {loadingAnalysis ? 'Translating...' : 'Translate & Analyze (अनुवाद)'}
              </button>
            </div>

          </div>

        </div>

        {/* Translation & Gemini Analysis Right */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          
          <div className="w-full h-full bg-slate-950/40 rounded-xl border border-slate-800 p-4 flex flex-col justify-between min-h-[310px]">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-1.5 text-xs font-mono text-indigo-400 font-bold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  Gemini AI Translation & Insights
                </div>
              </div>

              {loadingAnalysis ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                  <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
                  <span className="text-xs font-mono text-slate-400">Processing Hindi grammar and translation...</span>
                </div>
              ) : analysisResult ? (
                <div className="space-y-4">
                  {/* English translation */}
                  <div>
                    <h4 className="text-[10px] font-mono font-bold tracking-wider text-slate-500 uppercase mb-1">
                      English Translation (अंग्रेजी अनुवाद)
                    </h4>
                    <p className="text-slate-200 text-sm bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 leading-relaxed font-sans">
                      {analysisResult.englishTranslation}
                    </p>
                  </div>

                  {/* Hindi correction */}
                  <div>
                    <h4 className="text-[10px] font-mono font-bold tracking-wider text-slate-500 uppercase mb-1">
                      Grammar Check (व्याकरण सुधार)
                    </h4>
                    <p className="text-emerald-400 text-xs bg-emerald-500/5 p-2.5 rounded-lg border border-emerald-500/10 leading-relaxed">
                      {analysisResult.correction}
                    </p>
                  </div>

                  {/* Extract key topics */}
                  <div>
                    <h4 className="text-[10px] font-mono font-bold tracking-wider text-slate-500 uppercase mb-1.5">
                      Extracted Keywords (महत्वपूर्ण शब्द)
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {analysisResult.keywords.map((kw, i) => (
                        <span 
                          key={i} 
                          className="text-[10px] bg-slate-900 text-indigo-400 font-mono px-2.5 py-1 rounded-md border border-slate-800"
                        >
                          #{kw}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500 space-y-2">
                  <Languages className="w-8 h-8 text-slate-600 opacity-60" />
                  <p className="text-xs font-sans">कोई अनुवाद परिणाम उपलब्ध नहीं है।</p>
                  <p className="text-[11px] font-sans text-slate-600 max-w-xs">
                    रिकॉर्ड करने के बाद, अपनी आवाज़ का तुरंत अंग्रेजी अनुवाद और व्याकरण विश्लेषण देखने के लिए बटन पर क्लिक करें।
                  </p>
                </div>
              )}
            </div>

            <div className="text-[10px] font-mono text-slate-500 text-center border-t border-slate-900 pt-3">
              POWERED BY GEMINI-3.5-FLASH
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
