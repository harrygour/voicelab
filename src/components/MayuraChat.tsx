import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, MicOff, Volume2, Square, Sparkles, SendToBack, User, Bot, RefreshCw } from 'lucide-react';
import { ChatMessage } from '../types';
import { playBase64Audio, speakWithBrowser, stopAllAudio } from '../utils/audio';

interface MayuraChatProps {
  apiKeyValid: boolean | null;
}

export default function MayuraChat({ apiKeyValid }: MayuraChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'नमस्ते! मैं मयूरा हूँ, आपकी एडवांस हिंदी एआई सहायिका। मैं हिंदी में बात कर सकती हूँ और आपके वाक्यों को समझ सकती हूँ। आज मैं आपकी कैसे मदद करूँ?',
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Voice bot states
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [activeSpeechText, setActiveSpeechText] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Speech recognition for chat mic
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'hi-IN';

      rec.onstart = () => {
        setIsListeningMic(true);
      };

      rec.onresult = (event: any) => {
        const textResult = event.results[0][0].transcript;
        if (textResult) {
          setInputMsg(textResult);
        }
        setIsListeningMic(false);
      };

      rec.onerror = (e: any) => {
        console.error("Chat mic error:", e.error);
        setIsListeningMic(false);
      };

      rec.onend = () => {
        setIsListeningMic(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  // Auto scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const speakText = async (textToSpeak: string) => {
    stopAllAudio();
    setIsPlayingVoice(true);
    setActiveSpeechText(textToSpeak);

    try {
      if (apiKeyValid) {
        // Fetch real TTS audio from server
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: textToSpeak,
            voiceName: 'Zephyr' // Warm expressive female voice
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.audio) {
            await playBase64Audio(data.audio, 
              () => setIsPlayingVoice(true),
              () => setIsPlayingVoice(false)
            );
            return;
          }
        }
      }

      // Local browser fallback synthesis
      await speakWithBrowser(textToSpeak, 'female', 1.0,
        () => setIsPlayingVoice(true),
        () => setIsPlayingVoice(false)
      );
    } catch (e) {
      console.error("Failed to read bot response", e);
      setIsPlayingVoice(false);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMsg.trim() || loading) return;

    const userText = inputMsg.trim();
    setInputMsg('');
    stopAllAudio();
    setIsPlayingVoice(false);

    const userMessage: ChatMessage = {
      id: 'msg_' + Date.now(),
      role: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      // Gather conversation history
      const historyToSend = [...messages, userMessage].map(m => ({
        role: m.role,
        text: m.text
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: historyToSend })
      });

      if (!response.ok) {
        throw new Error("Failed to get chatbot response");
      }

      const data = await response.json();
      const botText = data.reply;

      const botMessage: ChatMessage = {
        id: 'msg_' + (Date.now() + 1),
        role: 'model',
        text: botText,
        timestamp: new Date().toLocaleTimeString()
      };

      setMessages(prev => [...prev, botMessage]);
      setLoading(false);

      // Auto read response
      await speakText(botText);

    } catch (err) {
      console.error("Chat fetch error:", err);
      setLoading(false);
      setMessages(prev => [...prev, {
        id: 'error_msg',
        role: 'model',
        text: 'क्षमा करें, नेटवर्क त्रुटि के कारण मैं उत्तर देने में असमर्थ हूँ। कृपया पुनः प्रयास करें।',
        timestamp: new Date().toLocaleTimeString()
      }]);
    }
  };

  const handleToggleMic = () => {
    if (!recognitionRef.current) {
      alert("स्पीच इनपुट इस ब्राउज़र में समर्थित नहीं है। कृपया लिखकर संवाद करें।");
      return;
    }

    if (isListeningMic) {
      recognitionRef.current.stop();
    } else {
      stopAllAudio();
      setIsPlayingVoice(false);
      recognitionRef.current.start();
    }
  };

  const handleStopSpeaking = () => {
    stopAllAudio();
    setIsPlayingVoice(false);
  };

  return (
    <div id="mayura-chat-panel" className="bg-slate-900/50 rounded-2xl border border-slate-800 p-5 md:p-6 shadow-xl relative overflow-hidden flex flex-col h-[520px]">
      
      {/* Visual background gradient decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/15 text-amber-500">
              <Bot className="w-5 h-5" />
            </span>
            <h2 className="font-sans font-bold text-lg text-white">मयूरा वॉइस बॉट <span className="text-slate-400 font-normal">(Mayura Chat)</span></h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">हिंदी आवाज सहायक के साथ वास्तविक बातचीत करें</p>
        </div>

        {/* Waves Animation Container */}
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wide">AI State:</span>
          {isPlayingVoice ? (
            <div className="flex gap-1 items-end h-3.5">
              <span className="w-1 bg-amber-400 rounded-sm animate-bounce h-2.5 [animation-delay:0.1s]"></span>
              <span className="w-1 bg-amber-400 rounded-sm animate-bounce h-4 [animation-delay:0.3s]"></span>
              <span className="w-1 bg-amber-400 rounded-sm animate-bounce h-1.5 [animation-delay:0.2s]"></span>
              <span className="w-1 bg-amber-400 rounded-sm animate-bounce h-3 [animation-delay:0.4s]"></span>
              <span className="text-[10px] text-amber-400 font-bold ml-1">Speaking</span>
            </div>
          ) : isListeningMic ? (
            <div className="flex gap-1 items-center">
              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping"></span>
              <span className="text-[10px] text-rose-500 font-bold">Listening</span>
            </div>
          ) : loading ? (
            <div className="flex gap-1 items-center">
              <RefreshCw className="w-3 h-3 text-indigo-400 animate-spin" />
              <span className="text-[10px] text-indigo-400">Processing</span>
            </div>
          ) : (
            <span className="text-[10px] text-slate-500">Idle</span>
          )}
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4 scrollbar-thin">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            
            {msg.role !== 'user' && (
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div className={`max-w-[80%] rounded-xl px-4 py-3 border ${
              msg.role === 'user' 
                ? 'bg-gradient-to-tr from-slate-900 to-slate-800 border-slate-700 text-white shadow-md' 
                : 'bg-slate-950/80 border-slate-800 text-slate-100'
            }`}>
              <p className="text-sm font-sans leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              
              <div className="flex justify-between items-center mt-2 pt-1 border-t border-slate-900/40 text-[10px] text-slate-500 font-mono">
                <span>{msg.timestamp}</span>
                {msg.role === 'model' && (
                  <button 
                    onClick={() => speakText(msg.text)}
                    className="text-amber-500 hover:text-amber-400 flex items-center gap-1 font-semibold hover:underline"
                  >
                    <Volume2 className="w-3 h-3" /> Play (सुने)
                  </button>
                )}
              </div>
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                <User className="w-4 h-4" />
              </div>
            )}

          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Bot className="w-4 h-4 animate-pulse" />
            </div>
            <div className="bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:0.1s]"></span>
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:0.3s]"></span>
              </div>
              <span className="text-xs text-slate-400">मयूरा सोच रही है...</span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* active speaker widget */}
      {isPlayingVoice && (
        <div className="mb-3 p-2 bg-amber-500/10 border border-amber-500/25 rounded-lg flex items-center justify-between animate-pulse shrink-0">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-amber-400 animate-bounce" />
            <span className="text-[11px] text-amber-300 font-sans truncate max-w-xs md:max-w-md">
              मयूरा बोल रही है: "{activeSpeechText.substring(0, 45)}..."
            </span>
          </div>
          <button 
            onClick={handleStopSpeaking}
            className="text-[10px] bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white px-2.5 py-1 rounded border border-rose-500/30 transition-all font-mono"
          >
            MUTE
          </button>
        </div>
      )}

      {/* Interactive Chat Input Area */}
      <form onSubmit={handleSend} className="flex gap-2 shrink-0">
        
        {/* Mic to transcribe */}
        <button
          type="button"
          onClick={handleToggleMic}
          className={`px-3 py-2.5 border rounded-xl flex items-center justify-center transition-all ${
            isListeningMic
              ? 'bg-rose-600 border-rose-500 text-white animate-pulse shadow-lg'
              : 'bg-slate-950 hover:bg-slate-850 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-rose-400'
          }`}
          title="हिंदी में बोलें"
        >
          {isListeningMic ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 fill-transparent" />}
        </button>

        <input
          type="text"
          value={inputMsg}
          onChange={(e) => setInputMsg(e.target.value)}
          placeholder={isListeningMic ? 'रिकॉर्डिंग... कृपया बोलें...' : 'यहाँ हिंदी या अंग्रेजी में लिखें...'}
          className="flex-1 bg-slate-950 text-white rounded-xl border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 px-4 text-sm"
          disabled={isListeningMic || loading}
        />

        <button
          type="submit"
          disabled={!inputMsg.trim() || loading}
          className="bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl px-4 py-2.5 flex items-center justify-center font-bold transition-all disabled:opacity-30 disabled:pointer-events-none"
        >
          <Send className="w-4 h-4" />
        </button>

      </form>

    </div>
  );
}
