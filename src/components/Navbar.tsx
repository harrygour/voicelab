import React from 'react';
import { Radio, Mic, Heart, RefreshCw, Cpu, Globe } from 'lucide-react';

interface NavbarProps {
  apiKeyValid: boolean | null;
  checkingStatus: boolean;
  onRefreshStatus: () => void;
}

export default function Navbar({ apiKeyValid, checkingStatus, onRefreshStatus }: NavbarProps) {
  return (
    <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
        
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-600 shadow-lg shadow-rose-500/20">
            <Radio className="w-5 h-5 text-white animate-pulse" />
            <div className="absolute -bottom-1 -right-1 flex w-4 h-4 rounded-full bg-slate-900 border border-slate-800 items-center justify-center">
              <Globe className="w-2.5 h-2.5 text-amber-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-sans font-bold text-lg tracking-tight text-white">वाणी</span>
              <span className="bg-gradient-to-r from-amber-400 to-rose-500 bg-clip-text text-transparent font-sans font-extrabold text-lg tracking-tight">AI</span>
              <span className="text-xs bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full font-mono font-medium tracking-wider border border-amber-500/25">VANI_VOICE_v2</span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono tracking-wide">HINDI SPEECH & VOICE AI PLATFORM</p>
          </div>
        </div>

        {/* Status Indicators & Navigation */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-1.5">
            <Cpu className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-300 font-mono">Gemini Backend:</span>
            <div className="flex items-center gap-1.5">
              <span className={`inline-block w-2 h-2 rounded-full ${apiKeyValid ? 'bg-emerald-500 animate-pulse' : apiKeyValid === false ? 'bg-amber-500' : 'bg-slate-500'}`}></span>
              <span className="text-xs font-mono font-semibold">
                {checkingStatus ? (
                  <span className="text-slate-500">Checking...</span>
                ) : apiKeyValid ? (
                  <span className="text-emerald-400">Connected (Real TTS)</span>
                ) : (
                  <span className="text-amber-400">Local Fallback</span>
                )}
              </span>
            </div>
            <button 
              onClick={onRefreshStatus} 
              disabled={checkingStatus}
              title="Refresh Connection"
              className="text-slate-400 hover:text-white transition-colors duration-200 p-0.5 rounded hover:bg-slate-800 ml-1"
            >
              <RefreshCw className={`w-3 h-3 ${checkingStatus ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          </div>

          <a 
            href="https://www.sarvam.ai" 
            target="_blank" 
            referrerPolicy="no-referrer"
            className="text-xs text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 bg-slate-900/40 px-3 py-1.5 rounded-lg transition-all duration-200"
          >
            Official Sarvam.ai
          </a>
        </div>
      </div>
    </nav>
  );
}
