import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2, Volume2, VolumeX, Keyboard, Send, Trash2, Video, MessageSquare, X, Sparkles, Film, UploadCloud, CheckCircle2, Sliders, AlertCircle, Crown, Zap } from "lucide-react";
import { getZoyaResponse, getZoyaAudio, resetZoyaSession } from "./services/geminiService";
import { processCommand } from "./services/commandService";
import { LiveSessionManager } from "./services/liveService";
import Visualizer from "./components/Visualizer";
import PermissionModal from "./components/PermissionModal";
import VideoModal from "./components/VideoModal";
import { playPCM } from "./utils/audioUtils";
import { saveVideoPermanently, getPermanentlySavedVideo, deletePermanentlySavedVideo } from "./utils/videoStorage";
import { BOSS_MODE_GREETINGS } from "./data/bossMode";
import { motion, AnimatePresence } from "motion/react";

type AppState = "idle" | "listening" | "processing" | "speaking";

interface ChatMessage {
  id: string;
  sender: "user" | "zoya";
  text: string;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function App() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem("jumon_chat_history") || localStorage.getItem("zoya_chat_history");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse chat history", e);
      }
    }
    return [
      {
        id: "welcome-1",
        sender: "zoya",
        text: "Assalamu Alaikum, Jumon Sir! Your personal AI voice assistant is online and ready. How may I serve you today, Creator?",
      },
    ];
  });
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
    localStorage.setItem("jumon_chat_history", JSON.stringify(messages));
  }, [messages]);

  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (liveSessionRef.current) {
      liveSessionRef.current.isMuted = isMuted;
    }
  }, [isMuted]);

  const [showTextInput, setShowTextInput] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string | null>(null);
  const [videoSize, setVideoSize] = useState<number | null>(null);
  const [isSavingVideo, setIsSavingVideo] = useState(false);
  const [savedVideoNotification, setSavedVideoNotification] = useState<string | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [videoOpacity, setVideoOpacity] = useState<number>(() => {
    const saved = localStorage.getItem("jumon_video_opacity");
    return saved ? parseFloat(saved) : 0.65;
  });
  const [showHudOverVideo, setShowHudOverVideo] = useState<boolean>(() => {
    const saved = localStorage.getItem("jumon_hud_over_video");
    return saved ? saved === "true" : true;
  });

  // Permanently load saved video from IndexedDB on initial mount
  useEffect(() => {
    getPermanentlySavedVideo()
      .then((saved) => {
        if (saved) {
          setVideoSrc(saved.url);
          setVideoName(saved.name);
          setVideoSize(saved.size);
        }
      })
      .catch((err) => {
        console.error("Failed to load saved video from IndexedDB:", err);
      });
  }, []);

  const handleVideoUpload = async (file: File) => {
    try {
      setIsSavingVideo(true);
      await saveVideoPermanently(file, file.name);
      
      // Revoke previous object URL if any
      if (videoSrc && videoSrc.startsWith("blob:")) {
        URL.revokeObjectURL(videoSrc);
      }

      const objUrl = URL.createObjectURL(file);
      setVideoSrc(objUrl);
      setVideoName(file.name);
      setVideoSize(file.size);
      
      setSavedVideoNotification("Video permanently saved! It will persist across all sessions.");
      setTimeout(() => setSavedVideoNotification(null), 4500);
    } catch (err) {
      console.error("Failed to save video permanently:", err);
      setSavedVideoNotification("Failed to save video permanently.");
      setTimeout(() => setSavedVideoNotification(null), 4000);
    } finally {
      setIsSavingVideo(false);
    }
  };

  const handleRemoveVideo = async () => {
    try {
      await deletePermanentlySavedVideo();
      if (videoSrc && videoSrc.startsWith("blob:")) {
        URL.revokeObjectURL(videoSrc);
      }
      setVideoSrc(null);
      setVideoName(null);
      setVideoSize(null);
      setShowVideoModal(false);
      setSavedVideoNotification("Video avatar removed. JUMON Cyber Visualizer active.");
      setTimeout(() => setSavedVideoNotification(null), 3500);
    } catch (err) {
      console.error("Failed to delete saved video:", err);
    }
  };

  const updateVideoOpacity = (val: number) => {
    setVideoOpacity(val);
    localStorage.setItem("jumon_video_opacity", val.toString());
  };

  const toggleHudOverVideo = () => {
    setShowHudOverVideo((prev) => {
      const next = !prev;
      localStorage.setItem("jumon_hud_over_video", next.toString());
      return next;
    });
  };

  const liveSessionRef = useRef<LiveSessionManager | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, appState, showHistory]);

  const handleTextCommand = useCallback(async (finalTranscript: string) => {
    if (!finalTranscript.trim()) {
      setAppState("idle");
      return;
    }

    setMessages((prev) => [...prev, { id: Date.now().toString(), sender: "user", text: finalTranscript }]);
    
    // If live session is active, send text through it
    if (isSessionActive && liveSessionRef.current) {
      liveSessionRef.current.sendText(finalTranscript);
      return;
    }

    setAppState("processing");

    // 1. Check for browser commands
    const commandResult = processCommand(finalTranscript);

    let responseText = "";

    if (commandResult.isBrowserAction) {
      responseText = commandResult.action;
      setMessages((prev) => [...prev, { id: Date.now().toString() + "-z", sender: "zoya", text: responseText }]);
      
      if (!isMuted) {
        setAppState("speaking");
        const audioBase64 = await getZoyaAudio(responseText);
        if (audioBase64) {
          await playPCM(audioBase64);
        }
      }

      setAppState("idle");

      setTimeout(() => {
        if (commandResult.url) {
          window.open(commandResult.url, "_blank");
        }
      }, 1500);
    } else {
      // 2. General Chit-Chat via Gemini
      responseText = await getZoyaResponse(finalTranscript, messagesRef.current);
      setMessages((prev) => [...prev, { id: Date.now().toString() + "-z", sender: "zoya", text: responseText }]);
      
      if (!isMuted) {
        setAppState("speaking");
        const audioBase64 = await getZoyaAudio(responseText);
        if (audioBase64) {
          await playPCM(audioBase64);
        }
      }
      setAppState("idle");
    }
  }, [isMuted, isSessionActive]);

  const bossModeIndexRef = useRef(0);

  const triggerBossMode = useCallback(async () => {
    if (appState === "processing" || appState === "speaking") return;

    const userPrompt = "👑 Activate Boss Mode! What are my priorities today, JUMON?";
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), sender: "user", text: userPrompt },
    ]);

    if (isSessionActive && liveSessionRef.current) {
      liveSessionRef.current.sendText(
        "Boss Mode activated! Greet me as your Creator Jumon and list today's priorities in your funniest, sassiest tone!"
      );
      return;
    }

    const script = BOSS_MODE_GREETINGS[bossModeIndexRef.current % BOSS_MODE_GREETINGS.length];
    bossModeIndexRef.current += 1;

    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString() + "-boss", sender: "zoya", text: script.message },
    ]);

    if (!isMuted) {
      try {
        setAppState("processing");
        const audioBase64 = await getZoyaAudio(script.message);
        if (audioBase64) {
          setAppState("speaking");
          await playPCM(audioBase64);
        }
      } catch (err) {
        console.error("Boss Mode audio playback error:", err);
      } finally {
        setAppState("idle");
      }
    } else {
      setAppState("idle");
    }
  }, [appState, isMuted, isSessionActive]);

  useEffect(() => {
    return () => {
      if (liveSessionRef.current) {
        liveSessionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = async () => {
    if (isSessionActive) {
      setIsSessionActive(false);
      if (liveSessionRef.current) {
        liveSessionRef.current.stop();
        liveSessionRef.current = null;
      }
      setAppState("idle");
      resetZoyaSession();
    } else {
      try {
        setIsSessionActive(true);
        resetZoyaSession();
        
        const session = new LiveSessionManager();
        session.isMuted = isMuted;
        liveSessionRef.current = session;
        
        session.onStateChange = (state) => {
          setAppState(state);
        };
        
        session.onMessage = (sender, text) => {
          setMessages((prev) => [...prev, { id: Date.now().toString() + "-" + sender, sender, text }]);
        };
        
        session.onCommand = (url) => {
          setTimeout(() => {
            window.open(url, "_blank");
          }, 1000);
        };

        await session.start();
      } catch (e) {
        console.error("Failed to start session", e);
        setShowPermissionModal(true);
        setIsSessionActive(false);
        setAppState("idle");
      }
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    
    handleTextCommand(textInput);
    setTextInput("");
    setShowTextInput(false);
  };

  // Get the most recent user and AI message for subtitle display
  const latestAiMessage = [...messages].reverse().find(m => m.sender === "zoya");
  const latestUserMessage = [...messages].reverse().find(m => m.sender === "user");

  return (
    <div 
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setIsDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith("video/")) {
          handleVideoUpload(file);
        }
      }}
      className="h-[100dvh] w-screen bg-[#02080b] text-white flex flex-col items-center justify-between font-sans relative overflow-hidden m-0 p-0 select-none"
    >
      {showPermissionModal && (
        <PermissionModal 
          onClose={() => setShowPermissionModal(false)} 
        />
      )}

      {/* Permanent Video Avatar Settings Modal */}
      <VideoModal
        isOpen={showVideoModal}
        onClose={() => setShowVideoModal(false)}
        videoSrc={videoSrc}
        videoName={videoName}
        videoSize={videoSize}
        videoOpacity={videoOpacity}
        onOpacityChange={updateVideoOpacity}
        showHudOverVideo={showHudOverVideo}
        onToggleHud={toggleHudOverVideo}
        onUpload={handleVideoUpload}
        onDelete={handleRemoveVideo}
        isSaving={isSavingVideo}
      />

      {/* Toast Notification for permanent video save */}
      <AnimatePresence>
        {savedVideoNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-18 md:top-22 z-50 bg-[#071720]/95 border border-cyan-400/40 text-cyan-200 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-xl text-xs md:text-sm font-medium shadow-cyan-950/60 max-w-md mx-4"
          >
            <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
            <span>{savedVideoNotification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md border-4 border-dashed border-cyan-400 flex flex-col items-center justify-center pointer-events-none p-6 text-center">
          <UploadCloud size={64} className="text-cyan-400 animate-bounce mb-4" />
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Drop Video to Save Permanently</h2>
          <p className="text-cyan-300 font-mono text-sm max-w-md">
            This video will be stored permanently in your browser's IndexedDB and load automatically every time.
          </p>
        </div>
      )}

      {/* Cinematic Background Gradients */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[55%] h-[55%] bg-cyan-900/25 blur-[140px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[55%] h-[55%] bg-pink-900/20 blur-[140px] rounded-full" />
        <div className="absolute top-[40%] right-[30%] w-[40%] h-[40%] bg-violet-900/15 blur-[160px] rounded-full" />
      </div>

      {/* Header */}
      <header className="absolute top-0 left-0 w-full flex justify-between items-center z-20 shrink-0 px-6 py-4 md:px-10 md:py-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-violet-500 to-pink-500 flex items-center justify-center font-bold text-base shadow-lg shadow-cyan-500/20 text-white">
            J
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold tracking-wider text-white">JUMON AI</h1>
            <p className="text-[11px] text-cyan-300/80 font-mono tracking-wide flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
              Creator: Jumon
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Action: Boss Mode Button */}
          <button
            id="boss-mode-quick-action"
            onClick={triggerBossMode}
            disabled={appState === "processing" || appState === "speaking"}
            className="flex items-center gap-1.5 px-3 py-1.5 md:px-3.5 md:py-2 rounded-full bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-pink-500/20 hover:from-amber-500/30 hover:to-pink-500/30 border border-amber-400/50 hover:border-amber-400/80 text-amber-200 text-xs md:text-sm font-semibold tracking-wide shadow-lg shadow-amber-500/10 hover:shadow-amber-500/25 transition-all duration-200 disabled:opacity-50 active:scale-95"
            title="Quick Action: Activate Boss Mode & Today's Priorities"
          >
            <Crown size={15} className="text-amber-300 animate-pulse shrink-0" />
            <span className="font-bold whitespace-nowrap">Boss Mode</span>
            <span className="hidden sm:inline-block text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
              Quick Action
            </span>
          </button>

          {/* Toggle Chat History */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`p-2.5 rounded-full transition-all border ${
              showHistory 
                ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-300" 
                : "bg-white/5 hover:bg-white/10 border-white/10 text-white/70 hover:text-white"
            }`}
            title="Conversation History"
          >
            <MessageSquare size={18} />
          </button>

          {/* Video Avatar Settings & Permanent Storage */}
          <button
            onClick={() => setShowVideoModal(true)}
            className={`p-2.5 rounded-full transition-all border flex items-center gap-1.5 ${
              videoSrc 
                ? "bg-gradient-to-r from-pink-500/20 to-cyan-500/20 border-pink-400/50 text-pink-300 shadow-lg shadow-pink-500/20" 
                : "bg-white/5 hover:bg-white/10 border-white/10 text-white/70 hover:text-white"
            }`}
            title={videoSrc ? "Avatar Video (Saved Permanently) - Click to manage" : "Set Permanent Video Avatar"}
          >
            {videoSrc ? (
              <>
                <Film size={18} className="text-pink-300" />
                <span className="hidden sm:inline text-xs font-mono font-medium text-pink-200">Video Active</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </>
            ) : (
              <Video size={18} />
            )}
          </button>

          {messages.length > 0 && (
            <button
              onClick={() => {
                if (confirm("Are you sure you want to clear the chat history, Jumon Sir?")) {
                  setMessages([]);
                  resetZoyaSession();
                }
              }}
              className="p-2.5 rounded-full bg-white/5 hover:bg-red-500/20 hover:text-red-400 transition-colors border border-white/10 text-white/70"
              title="Clear Chat History"
            >
              <Trash2 size={18} />
            </button>
          )}

          {/* Mute/Unmute */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/10 text-white/70 hover:text-white"
            title={isMuted ? "Unmute Audio" : "Mute Audio"}
          >
            {isMuted ? <VolumeX size={18} className="text-red-400" /> : <Volume2 size={18} />}
          </button>
        </div>
      </header>

      {/* Main Content - Visualizer & Status */}
      <main className="absolute inset-0 flex flex-row items-center justify-between w-full h-full z-10 overflow-hidden pt-20 pb-28 px-4 md:px-12 pointer-events-none">
        
        {/* Left Column: AI Status */}
        <div className="flex w-[25%] h-full flex-col justify-center gap-4 z-10">
          <div className="h-8">
            <AnimatePresence>
              {appState === "processing" && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center gap-2 text-cyan-300 text-sm md:text-base font-medium font-mono"
                >
                  <Loader2 size={18} className="animate-spin text-cyan-400" />
                  <span>Thinking...</span>
                </motion.div>
              )}
              {appState === "speaking" && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center gap-2 text-pink-300 text-sm md:text-base font-medium font-mono"
                >
                  <Sparkles size={18} className="animate-pulse text-pink-400" />
                  <span>Speaking...</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Center Visualizer & Video Avatar */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          {videoSrc && (
            <video 
              src={videoSrc}
              autoPlay
              loop
              muted={true}
              playsInline
              className="w-full h-full object-cover transition-opacity duration-500"
              style={{ opacity: videoOpacity }}
            />
          )}
          {(!videoSrc || showHudOverVideo) && (
            <div className={videoSrc ? "absolute inset-0 flex items-center justify-center scale-95" : ""}>
              <Visualizer state={appState} />
            </div>
          )}
        </div>

        {/* Right Column: User Status */}
        <div className="flex w-[25%] h-full flex-col justify-center gap-4 z-10">
          <div className="h-8 flex justify-end">
            <AnimatePresence>
              {appState === "listening" && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-2 text-violet-300 text-sm md:text-base font-medium font-mono"
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-ping" />
                  <span>Listening...</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Floating Subtitle / Transcript Banner */}
      <div className="absolute bottom-28 md:bottom-32 left-0 w-full flex flex-col items-center z-20 px-4 pointer-events-none">
        <AnimatePresence mode="wait">
          {latestAiMessage && appState !== "listening" && (
            <motion.div
              key={latestAiMessage.id}
              initial={{ opacity: 0, y: 15, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.96 }}
              className={`pointer-events-auto max-w-xl w-full backdrop-blur-xl rounded-2xl p-4 md:p-5 shadow-2xl text-center ${
                latestAiMessage.id.includes("-boss")
                  ? "bg-[#0c0d06]/90 border border-amber-400/60 shadow-amber-950/70 shadow-2xl"
                  : "bg-black/60 border border-cyan-500/30 shadow-cyan-950/50"
              }`}
            >
              <div className="text-[11px] font-mono uppercase tracking-widest mb-1 flex items-center justify-center gap-1.5 font-bold">
                {latestAiMessage.id.includes("-boss") ? (
                  <>
                    <Crown size={14} className="text-amber-300 animate-bounce" />
                    <span className="text-amber-300">JUMON AI • Boss Mode Protocol</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={12} className="text-cyan-400" />
                    <span className="text-cyan-400/90">JUMON AI to Jumon</span>
                  </>
                )}
              </div>
              <p className={`text-sm md:text-base font-medium leading-relaxed ${
                latestAiMessage.id.includes("-boss") ? "text-amber-50" : "text-cyan-50"
              }`}>
                "{latestAiMessage.text}"
              </p>
            </motion.div>
          )}
          {appState === "listening" && latestUserMessage && (
            <motion.div
              key={latestUserMessage.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="pointer-events-auto max-w-md w-full bg-black/50 border border-violet-500/30 backdrop-blur-xl rounded-2xl px-4 py-2.5 text-center shadow-lg"
            >
              <div className="text-[10px] font-mono uppercase tracking-wider text-violet-400/80 mb-0.5">
                Jumon Sir
              </div>
              <p className="text-xs md:text-sm text-violet-100 italic">
                "{latestUserMessage.text}"
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Conversation Drawer / History Modal */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, x: 320 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 320 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full sm:w-96 bg-[#070e14]/95 border-l border-white/10 backdrop-blur-2xl z-40 flex flex-col p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <MessageSquare size={18} className="text-cyan-400" />
                <h2 className="font-bold text-base text-white tracking-wide">Transcript Log</h2>
              </div>
              <button 
                onClick={() => setShowHistory(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1 scrollbar-hide text-sm">
              {messages.length === 0 ? (
                <div className="text-center text-white/40 py-12 text-xs">
                  No conversation history yet. Start talking or type a message to Jumon AI!
                </div>
              ) : (
                messages.map((m) => (
                  <div 
                    key={m.id}
                    className={`p-3 rounded-xl border ${
                      m.sender === "user"
                        ? "bg-violet-500/10 border-violet-500/20 text-violet-100 ml-4 text-right"
                        : "bg-cyan-500/10 border-cyan-500/20 text-cyan-100 mr-4 text-left"
                    }`}
                  >
                    <div className="text-[10px] font-mono text-white/50 mb-1">
                      {m.sender === "user" ? "Jumon (Creator)" : "JUMON AI"}
                    </div>
                    <div className="text-xs md:text-sm whitespace-pre-wrap">{m.text}</div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="pt-3 border-t border-white/10 flex gap-2">
              <button
                onClick={() => {
                  setMessages([]);
                  resetZoyaSession();
                }}
                disabled={messages.length === 0}
                className="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-white/60 text-xs font-medium border border-white/10 transition-colors disabled:opacity-40"
              >
                Clear All Logs
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <footer className="absolute bottom-0 left-0 w-full flex flex-col items-center justify-center pb-6 md:pb-8 z-20 shrink-0 gap-3">
        {/* Quick Prompts for Jumon */}
        {!isSessionActive && !showTextInput && messages.length <= 2 && (
          <div className="flex items-center gap-2 overflow-x-auto max-w-full px-4 py-1 scrollbar-hide">
            <button
              onClick={() => handleTextCommand("My name is JUMON And I am your creator!")}
              className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-400/40 text-[12px] text-cyan-200/90 whitespace-nowrap transition-colors"
            >
              👑 "I am Jumon, your creator!"
            </button>
            <button
              onClick={() => handleTextCommand("Tell me something sassy and witty in Bangla")}
              className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-pink-500/20 border border-white/10 hover:border-pink-400/40 text-[12px] text-pink-200/90 whitespace-nowrap transition-colors"
            >
              ✨ "Speak in Bangla"
            </button>
            <button
              onClick={() => handleTextCommand("Play a song on YouTube")}
              className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-violet-500/20 border border-white/10 hover:border-violet-400/40 text-[12px] text-violet-200/90 whitespace-nowrap transition-colors"
            >
              🎵 "Play music on YouTube"
            </button>
          </div>
        )}

        <AnimatePresence>
          {showTextInput && (
            <motion.form 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              onSubmit={handleTextSubmit}
              className="w-full max-w-md flex items-center gap-2 bg-black/60 border border-cyan-500/30 rounded-full p-1 pl-4 backdrop-blur-xl shadow-2xl shadow-cyan-950/40"
            >
              <input 
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type a message to Jumon AI, Boss..."
                className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-white/30 text-sm"
                autoFocus
              />
              <button 
                type="submit"
                disabled={!textInput.trim()}
                className="p-2.5 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-600 hover:to-violet-600 disabled:opacity-40 transition-all text-white"
              >
                <Send size={16} />
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleListening}
            className={`
              group relative flex items-center gap-3 px-8 py-4 rounded-full font-medium tracking-wide transition-all duration-300 shadow-2xl
              ${
                isSessionActive
                  ? "bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30 shadow-red-500/20"
                  : "bg-gradient-to-r from-cyan-500/20 via-violet-500/20 to-pink-500/20 text-white border border-cyan-400/30 hover:border-cyan-400/60 hover:scale-105 shadow-cyan-500/20"
              }
            `}
          >
            {isSessionActive ? (
              <>
                <MicOff size={20} />
                <span>End Voice Session</span>
              </>
            ) : (
              <>
                <Mic size={20} className="group-hover:animate-bounce text-cyan-400" />
                <span className="font-semibold">Start Voice Session</span>
              </>
            )}
          </button>
          
          {!isSessionActive && (
            <button
              onClick={() => setShowTextInput(!showTextInput)}
              className={`p-4 rounded-full border transition-all shadow-2xl ${
                showTextInput 
                  ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-300"
                  : "bg-white/5 border-white/10 hover:bg-white/10 text-white/70 hover:text-white"
              }`}
              title="Type instead"
            >
              <Keyboard size={20} />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
