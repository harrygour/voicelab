import React from 'react';
import { FileAudio, Clipboard, Check, Volume2, Clock, Trash2, ArrowRight } from 'lucide-react';
import { TTSHistoryItem } from '../types';

interface HistoryPanelProps {
  ttsHistory: TTSHistoryItem[];
  onClearHistory: () => void;
  onPlayItem: (text: string, gender: 'male' | 'female') => void;
}

export default function HistoryPanel({ ttsHistory, onClearHistory, onPlayItem }: HistoryPanelProps) {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div id="history-panel" className="bg-slate-900/40 rounded-2xl border border-slate-800 p-5 shadow-xl">
      <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-4">
        <div>
          <h3 className="text-sm font-mono font-bold uppercase text-slate-300 tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            Recent Audio Activities
          </h3>
          <p className="text-[11px] text-slate-400">Generated text-to-speech files during this session</p>
        </div>
        
        {ttsHistory.length > 0 && (
          <button
            onClick={onClearHistory}
            className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-1 font-mono transition-colors hover:underline"
          >
            <Trash2 className="w-3 h-3" /> Clear Log
          </button>
        )}
      </div>

      {ttsHistory.length === 0 ? (
        <div className="py-8 text-center text-slate-500 flex flex-col items-center justify-center space-y-1.5">
          <FileAudio className="w-8 h-8 text-slate-700 opacity-60" />
          <p className="text-xs font-sans">No generated speech clips yet.</p>
          <p className="text-[10px] font-mono text-slate-600">Activate 'Bulbul TTS' to generate real-time Indic vocals.</p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
          {ttsHistory.map((item) => (
            <div 
              key={item.id} 
              className="bg-slate-950/50 hover:bg-slate-950 border border-slate-850 p-3 rounded-xl flex items-center justify-between gap-3 transition-all duration-200"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-200 font-sans truncate pr-2">{item.text}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800 font-mono">
                    {item.voiceName}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" /> {item.timestamp}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => onPlayItem(item.text, item.gender)}
                  className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-400 hover:text-amber-300 rounded-lg transition-colors"
                  title="Replay Audio"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleCopy(item.text, item.id)}
                  className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
                  title="Copy Original Text"
                >
                  {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Clipboard className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
