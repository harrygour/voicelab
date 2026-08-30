import React, { useState } from 'react';
import { FileAudio, Clipboard, Check, Volume2, Clock, Trash2, Download } from 'lucide-react';
import { TTSHistoryItem } from '../types';
import { downloadAudioFile, base64ToWavBlob, generateSpeechWav } from '../utils/audio';

interface HistoryPanelProps {
  ttsHistory: TTSHistoryItem[];
  onClearHistory: () => void;
  onPlayItem: (text: string, gender: 'male' | 'female', audioBase64?: string) => void;
}

export default function HistoryPanel({ ttsHistory, onClearHistory, onPlayItem }: HistoryPanelProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadedId, setDownloadedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = (item: TTSHistoryItem) => {
    const filename = `vani_ai_hindi_${item.id.replace('tts_', '')}.mp3`;
    if (item.audioBase64) {
      downloadAudioFile(item.audioBase64, filename);
    } else {
      const synth = generateSpeechWav(item.text, item.gender);
      downloadAudioFile(synth.blob, filename);
    }
    setDownloadedId(item.id);
    setTimeout(() => setDownloadedId(null), 2000);
  };

  return (
    <div id="history-panel" className="bg-slate-900/40 rounded-2xl border border-slate-800 p-5 shadow-xl">
      <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-4">
        <div>
          <h3 className="text-sm font-mono font-bold uppercase text-slate-300 tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            हाल की वाणी वॉइस गतिविधियाँ (Recent Audio History)
          </h3>
          <p className="text-[11px] text-slate-400">जनरेट की गई हिंदी ऑडियो फ़ाइलें तुरंत सुनें या MP3 में डाउनलोड करें</p>
        </div>
        
        {ttsHistory.length > 0 && (
          <button
            onClick={onClearHistory}
            className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-1 font-mono transition-colors hover:underline"
          >
            <Trash2 className="w-3 h-3" /> Clear Log (इतिहास हटाएं)
          </button>
        )}
      </div>

      {ttsHistory.length === 0 ? (
        <div className="py-8 text-center text-slate-500 flex flex-col items-center justify-center space-y-1.5">
          <FileAudio className="w-8 h-8 text-slate-700 opacity-60" />
          <p className="text-xs font-sans">अभी तक कोई ऑडियो क्लिप जनरेट नहीं हुई है।</p>
          <p className="text-[10px] font-mono text-slate-600">ऊपर 'बुलबुल TTS' में हिंदी टेक्स्ट दर्ज करें और 'आवाज़ बनाएँ' पर क्लिक करें।</p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
          {ttsHistory.map((item) => (
            <div 
              key={item.id} 
              className="bg-slate-950/60 hover:bg-slate-950 border border-slate-800/80 p-3 rounded-xl flex items-center justify-between gap-3 transition-all duration-200"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-200 font-sans truncate pr-2">{item.text}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] bg-slate-900 text-amber-400/90 px-2 py-0.5 rounded border border-slate-800 font-mono">
                    {item.voiceName}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" /> {item.timestamp}
                  </span>
                  {item.audioBase64 && (
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-400 font-mono px-1.5 py-0.2 rounded border border-emerald-500/20">
                      MP3 Ready
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => onPlayItem(item.text, item.gender, item.audioBase64)}
                  className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-400 hover:text-amber-300 rounded-lg transition-colors"
                  title="Replay Audio"
                >
                  <Volume2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleDownload(item)}
                  className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-emerald-400 hover:text-emerald-300 rounded-lg transition-colors"
                  title="Download MP3"
                >
                  {downloadedId === item.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Download className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => handleCopy(item.text, item.id)}
                  className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
                  title="Copy Original Text"
                >
                  {copiedId === item.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Clipboard className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

