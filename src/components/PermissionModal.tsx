import React, { useState } from 'react';
import { motion } from 'motion/react';
import { MicOff, ExternalLink, RefreshCw, Volume2, ShieldAlert } from 'lucide-react';
import { requestMicrophonePermission } from '../utils/nativeUtils';

interface Props {
  onClose: () => void;
  onOpenTextInput?: () => void;
}

export default function PermissionModal({ onClose, onOpenTextInput }: Props) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  const handleRequestMicAgain = async () => {
    setIsRetrying(true);
    setRetryError(null);
    try {
      const granted = await requestMicrophonePermission();
      if (granted) {
        onClose();
      } else {
        setRetryError("Permission still blocked by your browser or Android settings.");
      }
    } catch (err: any) {
      console.warn("Microphone request error:", err);
      if (err.name === "NotAllowedError" || err.message?.includes("Permission denied")) {
        setRetryError("Permission still blocked by your browser or Android settings.");
      } else {
        setRetryError(err.message || "Microphone unavailable.");
      }
    } finally {
      setIsRetrying(false);
    }
  };

  const handleOpenNewTab = () => {
    // Open the current app in a fresh standalone browser window
    const targetUrl = window.location.href;
    const win = window.open(targetUrl, '_blank', 'noopener,noreferrer');
    if (!win) {
      window.location.href = targetUrl;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-[#0a1218] border border-cyan-500/30 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col items-center text-center relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-pink-500 to-amber-500" />
        
        <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center mb-5 text-red-400">
          <MicOff size={32} />
        </div>
        
        <h2 className="text-xl md:text-2xl font-bold text-white mb-2 tracking-wide">
          Microphone Access Blocked
        </h2>
        
        <p className="text-white/70 text-xs md:text-sm mb-5 leading-relaxed">
          The browser preview blocked microphone permission. JUMON AI needs your mic to hear voice commands.
        </p>
        
        {isInIframe && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 text-left w-full mb-4 flex items-start gap-3">
            <ShieldAlert size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200/90 leading-relaxed">
              <strong className="block text-amber-200 font-semibold mb-0.5">Running in Preview Frame</strong>
              Browsers restrict microphone access inside nested web frames. Opening in a new tab grants instant mic access!
            </div>
          </div>
        )}

        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left w-full mb-5">
          <p className="text-xs font-semibold text-white/90 uppercase font-mono tracking-wider mb-2 flex items-center gap-1.5">
            <Volume2 size={13} className="text-cyan-400" /> Quick Fix Steps:
          </p>
          <ol className="text-xs text-white/70 list-decimal pl-4 space-y-1.5 leading-relaxed">
            {isInIframe && (
              <li>
                Click <strong>"Open in New Tab"</strong> below to bypass sandbox frame restrictions.
              </li>
            )}
            <li>
              Click the <strong>Lock / Settings icon (🔒 / ⚙️)</strong> beside the URL bar.
            </li>
            <li>
              Set <strong>Microphone</strong> to <strong>Allow</strong>.
            </li>
            <li>
              Or simply use the <strong>Type Chat</strong> input without needing a mic!
            </li>
          </ol>
        </div>

        {retryError && (
          <div className="w-full text-xs text-red-400 bg-red-500/10 border border-red-500/25 rounded-xl py-2 px-3 mb-4">
            {retryError}
          </div>
        )}
        
        <div className="flex flex-col w-full gap-2.5">
          {isInIframe && (
            <button 
              id="open-in-new-tab-btn"
              onClick={handleOpenNewTab}
              className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/50 active:scale-95"
            >
              <ExternalLink size={16} />
              <span>Open in New Tab (Best Experience)</span>
            </button>
          )}

          <div className="flex gap-2 w-full">
            <button 
              id="retry-mic-btn"
              onClick={handleRequestMicAgain}
              disabled={isRetrying}
              className="flex-1 py-2.5 px-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw size={14} className={isRetrying ? "animate-spin text-cyan-400" : ""} />
              <span>{isRetrying ? "Requesting..." : "Prompt Mic Again"}</span>
            </button>

            {onOpenTextInput && (
              <button 
                id="switch-to-type-btn"
                onClick={() => {
                  onClose();
                  onOpenTextInput();
                }}
                className="flex-1 py-2.5 px-3 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 font-medium text-xs rounded-xl transition-all"
              >
                Type Commands
              </button>
            )}
          </div>

          <button 
            onClick={onClose}
            className="w-full py-2 px-4 text-white/50 hover:text-white text-xs font-medium transition-colors"
          >
            Dismiss
          </button>
        </div>
      </motion.div>
    </div>
  );
}
