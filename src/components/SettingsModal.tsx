import React, { useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, Moon, Sun, Bell, BellOff, Languages, 
  Film, UploadCloud, Trash2, CheckCircle2, Sliders, Eye, Loader2, Sparkles, Flame, MessageSquareQuote,
  Volume2, Play, Square, Radio, ChevronRight
} from "lucide-react";
import { ZOYA_VOICE_MODELS, sampleZoyaVoice } from "../services/geminiService";
import { playPCM } from "../utils/audioUtils";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Android XML specified options
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  pushNotifications: boolean;
  onToggleNotifications: () => void;
  currentLanguage: "en" | "bn";
  onToggleLanguage: () => void;
  // Zoya Voice Model
  selectedVoiceModel: string;
  onSelectVoiceModel: (voiceId: string) => void;
  // Avatar Video & Persona Options
  videoSrc: string | null;
  videoName: string | null;
  videoSize: number | null;
  videoOpacity: number;
  onOpacityChange: (val: number) => void;
  showHudOverVideo: boolean;
  onToggleHud: () => void;
  onUploadVideo: (file: File) => Promise<void>;
  onDeleteVideo: () => Promise<void>;
  isSavingVideo: boolean;
  isSassyMode: boolean;
  onToggleSassyMode: () => void;
}

function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function SettingsModal({
  isOpen,
  onClose,
  isDarkMode,
  onToggleDarkMode,
  pushNotifications,
  onToggleNotifications,
  currentLanguage,
  onToggleLanguage,
  selectedVoiceModel,
  onSelectVoiceModel,
  videoSrc,
  videoName,
  videoSize,
  videoOpacity,
  onOpacityChange,
  showHudOverVideo,
  onToggleHud,
  onUploadVideo,
  onDeleteVideo,
  isSavingVideo,
  isSassyMode,
  onToggleSassyMode,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"general" | "avatar">("general");
  const [showVoicePicker, setShowVoicePicker] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadVideo(file);
    }
  };

  const handlePlayVoiceSample = async (voiceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (playingVoiceId) {
      setPlayingVoiceId(null);
      return;
    }
    setPlayingVoiceId(voiceId);
    try {
      const audioBase64 = await sampleZoyaVoice(voiceId, currentLanguage);
      if (audioBase64) {
        await playPCM(audioBase64);
      }
    } catch (err) {
      console.error("Voice sample error:", err);
    } finally {
      setPlayingVoiceId(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("video/")) {
      onUploadVideo(file);
    }
  };

  const currentVoice = ZOYA_VOICE_MODELS.find((v) => v.id === selectedVoiceModel) || ZOYA_VOICE_MODELS[0];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Card - Styled faithfully to the Android RelativeLayout / Modern Glass UI */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-[#070e14] border border-cyan-500/30 rounded-2xl shadow-2xl p-6 text-white z-10 max-h-[92vh] flex flex-col justify-between overflow-hidden"
        >
          {/* Top Bar with Title matching Android XML: "Settings" (24sp bold) */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>Settings</span>
                <span className="text-xs font-mono font-normal text-cyan-300/70 border border-cyan-500/30 px-2 py-0.5 rounded-full">
                  Android & Web
                </span>
              </h2>
              <p className="text-xs text-white/50 mt-0.5">App preferences & AI customizer</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 pt-3 pb-2 border-b border-white/5 shrink-0">
            <button
              onClick={() => setActiveTab("general")}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "general"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-md shadow-cyan-950/40"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <Sliders size={14} />
              <span>General Settings</span>
            </button>
            <button
              onClick={() => setActiveTab("avatar")}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "avatar"
                  ? "bg-pink-500/20 text-pink-300 border border-pink-500/40 shadow-md shadow-pink-950/40"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <Film size={14} />
              <span>Avatar & Persona</span>
              {videoSrc && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 scrollbar-hide">
            {activeTab === "general" ? (
              <div className="space-y-3">
                {/* 1. ডার্ক মোড অপশন (Dark Mode Switch) */}
                <div 
                  id="switch_dark_mode_container"
                  className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 hover:bg-white/[0.08] border border-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-400 flex items-center justify-center shrink-0">
                      {isDarkMode ? <Moon size={20} /> : <Sun size={20} />}
                    </div>
                    <div>
                      <div className="text-lg font-medium text-white">Dark Mode</div>
                      <div className="text-xs text-white/50">
                        {isDarkMode ? "Cyber dark OLED theme active" : "High contrast mode active"}
                      </div>
                    </div>
                  </div>

                  <button
                    id="switch_dark_mode"
                    type="button"
                    onClick={onToggleDarkMode}
                    className={`w-12 h-6.5 rounded-full transition-all relative p-0.5 shrink-0 focus:outline-none ${
                      isDarkMode ? "bg-violet-500 shadow-md shadow-violet-500/30" : "bg-white/20"
                    }`}
                    role="switch"
                    aria-checked={isDarkMode}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform shadow-md ${
                        isDarkMode ? "translate-x-5.5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* 2. পুশ নোটিফিকেশন অপশন (Push Notifications Switch) */}
                <div 
                  id="switch_notifications_container"
                  className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 hover:bg-white/[0.08] border border-white/10 transition-colors mt-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
                      {pushNotifications ? <Bell size={20} /> : <BellOff size={20} />}
                    </div>
                    <div>
                      <div className="text-lg font-medium text-white">Push Notifications</div>
                      <div className="text-xs text-white/50">
                        {pushNotifications ? "Enabled (system alerts on messages)" : "Disabled (silent mode)"}
                      </div>
                    </div>
                  </div>

                  <button
                    id="switch_notifications"
                    type="button"
                    onClick={onToggleNotifications}
                    className={`w-12 h-6.5 rounded-full transition-all relative p-0.5 shrink-0 focus:outline-none ${
                      pushNotifications ? "bg-cyan-500 shadow-md shadow-cyan-500/30" : "bg-white/20"
                    }`}
                    role="switch"
                    aria-checked={pushNotifications}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform shadow-md ${
                        pushNotifications ? "translate-x-5.5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* 3. ভাষা পরিবর্তন অপশন (Change Language English/Bangla) */}
                <div
                  id="btn_change_language"
                  onClick={onToggleLanguage}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 hover:bg-white/[0.09] border border-white/10 cursor-pointer transition-all active:scale-[0.99] mt-2 group"
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Languages size={20} />
                    </div>
                    <div>
                      <div className="text-lg font-medium text-white">
                        Change Language (English/Bangla)
                      </div>
                      <div className="text-xs text-white/50">
                        Current: <span className="text-emerald-300 font-bold">{currentLanguage === "bn" ? "বাংলা (Bangla)" : "English"}</span>
                      </div>
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-mono font-bold tracking-wide">
                    {currentLanguage === "bn" ? "বাংলা" : "EN"}
                  </span>
                </div>

                {/* 4. জয়া ভয়েস মডেল (Zoya Voice Model) */}
                <div
                  id="btn_zoya_voice_model"
                  onClick={() => setShowVoicePicker((prev) => !prev)}
                  className="flex flex-col p-3.5 rounded-xl bg-white/5 hover:bg-white/[0.09] border border-white/10 cursor-pointer transition-all active:scale-[0.99] mt-2 group"
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/30 text-pink-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Volume2 size={20} />
                      </div>
                      <div>
                        <div className="text-lg font-medium text-white flex items-center gap-2">
                          <span>Zoya Voice Model</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                            {currentVoice.gender}
                          </span>
                        </div>
                        <div className="text-xs text-white/50">
                          Current: <span className="text-pink-300 font-bold">{currentVoice.name}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => handlePlayVoiceSample(selectedVoiceModel, e)}
                        className={`p-2 rounded-lg border text-xs font-mono transition-all flex items-center gap-1.5 ${
                          playingVoiceId === selectedVoiceModel
                            ? "bg-pink-500 text-white border-pink-400 animate-pulse shadow-md shadow-pink-500/30"
                            : "bg-white/10 text-white/80 border-white/15 hover:bg-white/20"
                        }`}
                        title="Sample this voice"
                      >
                        {playingVoiceId === selectedVoiceModel ? <Square size={13} /> : <Play size={13} />}
                        <span className="hidden sm:inline">Sample</span>
                      </button>
                      <ChevronRight
                        size={18}
                        className={`text-white/40 transition-transform ${showVoicePicker ? "rotate-90 text-pink-400" : ""}`}
                      />
                    </div>
                  </div>

                  {/* Expandable Voice List */}
                  {showVoicePicker && (
                    <div
                      className="mt-3 pt-3 border-t border-white/10 space-y-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="text-[11px] font-mono text-white/60 mb-1 flex items-center justify-between">
                        <span>Select Zoya Voice Persona:</span>
                        <span className="text-pink-300/80">Gemini 3.8 Flash Audio</span>
                      </div>
                      <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
                        {ZOYA_VOICE_MODELS.map((voice) => {
                          const isSelected = selectedVoiceModel === voice.id;
                          const isPlaying = playingVoiceId === voice.id;
                          return (
                            <div
                              key={voice.id}
                              onClick={() => onSelectVoiceModel(voice.id)}
                              className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-pink-500/20 border-pink-500/60 text-white shadow-sm"
                                  : "bg-white/[0.03] border-white/5 hover:bg-white/[0.08] text-white/70"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                                    isSelected ? "border-pink-400 bg-pink-500" : "border-white/30"
                                  }`}
                                >
                                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                                    <span className="truncate">{voice.name}</span>
                                    {voice.isDefault && (
                                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                                        Signature
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-white/50 truncate font-mono">
                                    {voice.tagline} • {voice.tone}
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => handlePlayVoiceSample(voice.id, e)}
                                className={`px-2 py-1 rounded text-[10px] font-mono border transition-all shrink-0 flex items-center gap-1 ${
                                  isPlaying
                                    ? "bg-pink-500 text-white border-pink-400 animate-pulse"
                                    : "bg-white/10 text-white/80 border-white/20 hover:bg-white/20"
                                }`}
                              >
                                {isPlaying ? <Square size={10} /> : <Play size={10} />}
                                <span>{isPlaying ? "Stop" : "Test"}</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Sassy Mode Toggle Card */}
                <div className="bg-gradient-to-br from-pink-950/40 via-purple-950/30 to-amber-950/20 border border-pink-500/40 rounded-xl p-4 space-y-3 shadow-lg shadow-pink-950/20">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-pink-500/20 border border-pink-500/40 text-pink-400 flex items-center justify-center shrink-0">
                        <Flame size={18} className={isSassyMode ? "text-pink-300 animate-pulse" : "text-pink-400/70"} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white tracking-wide">Sassy Mode</h4>
                          {isSassyMode && (
                            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 uppercase">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-white/60">
                          Prepends witty & sassy remarks from JUMON AI before every response
                        </p>
                      </div>
                    </div>

                    <button
                      id="sassy-mode-toggle-btn"
                      type="button"
                      onClick={onToggleSassyMode}
                      className={`w-12 h-6.5 rounded-full transition-all relative p-0.5 shrink-0 focus:outline-none ${
                        isSassyMode ? "bg-gradient-to-r from-pink-500 to-amber-500 shadow-md shadow-pink-500/30" : "bg-white/20"
                      }`}
                      role="switch"
                      aria-checked={isSassyMode}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white transition-transform shadow-md ${
                          isSassyMode ? "translate-x-5.5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="pt-2 border-t border-pink-500/20 flex items-start gap-2 text-[11px] text-pink-200/80 leading-relaxed font-mono">
                    <MessageSquareQuote size={14} className="text-pink-400 shrink-0 mt-0.5" />
                    <span>
                      {isSassyMode 
                        ? "Example: \"Bow down, mortals! JUMON AI is serving pure intellect with extra attitude...\"" 
                        : "Turn on to give JUMON AI maximum attitude and witty commentary on every prompt."}
                    </span>
                  </div>
                </div>

                {/* Zoya Voice Persona Selector Card in Persona Tab */}
                <div className="bg-gradient-to-br from-indigo-950/40 via-purple-950/30 to-pink-950/20 border border-indigo-500/30 rounded-xl p-4 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 flex items-center justify-center">
                        <Volume2 size={16} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white tracking-wide">Zoya Voice Model</h4>
                        <p className="text-[11px] text-white/50">Gemini 3.8 Flash Neural Speech</p>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Active: {currentVoice.name.split(" ")[1] || currentVoice.id}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2 pt-1">
                    {ZOYA_VOICE_MODELS.map((voice) => {
                      const isSelected = selectedVoiceModel === voice.id;
                      const isPlaying = playingVoiceId === voice.id;
                      return (
                        <div
                          key={voice.id}
                          onClick={() => onSelectVoiceModel(voice.id)}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all cursor-pointer ${
                            isSelected
                              ? "bg-indigo-500/20 border-indigo-400 text-white shadow-md shadow-indigo-950/50"
                              : "bg-white/[0.03] border-white/10 hover:bg-white/[0.07] text-white/70"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                isSelected ? "border-indigo-400 bg-indigo-500" : "border-white/30"
                              }`}
                            >
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-white flex items-center gap-2">
                                <span>{voice.name}</span>
                                {voice.isDefault && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                                    Signature
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-white/60 truncate mt-0.5">
                                {voice.tagline} • <span className="text-indigo-200/70">{voice.tone}</span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handlePlayVoiceSample(voice.id, e)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-all shrink-0 flex items-center gap-1.5 ${
                              isPlaying
                                ? "bg-indigo-500 text-white border-indigo-400 animate-pulse shadow-md"
                                : "bg-white/10 text-white/80 border-white/20 hover:bg-white/20"
                            }`}
                          >
                            {isPlaying ? <Square size={12} /> : <Play size={12} />}
                            <span>{isPlaying ? "Stop" : "Test Voice"}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Permanent Video Avatar Section */}
                {videoSrc ? (
                  <div className="bg-cyan-950/40 border border-cyan-500/30 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                        <CheckCircle2 size={16} />
                        <span>Permanent Video Active</span>
                      </div>
                      <span className="text-[11px] font-mono text-cyan-300/70">
                        {formatBytes(videoSize)}
                      </span>
                    </div>

                    <div className="text-sm font-medium text-white truncate flex items-center gap-2">
                      <Film size={14} className="text-cyan-400 shrink-0" />
                      <span className="truncate">{videoName || "Saved Avatar Video"}</span>
                    </div>

                    {/* Video mini-preview */}
                    <div className="w-full h-32 rounded-lg overflow-hidden bg-black/60 relative border border-white/10 flex items-center justify-center">
                      <video
                        src={videoSrc}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                        style={{ opacity: videoOpacity }}
                      />
                      <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-0.5 rounded text-[10px] font-mono text-white/70">
                        Preview ({Math.round(videoOpacity * 100)}%)
                      </div>
                    </div>

                    {/* Controls inside active card */}
                    <div className="pt-2 space-y-3">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-white/70 font-mono">
                          <span className="flex items-center gap-1.5">
                            <Sliders size={13} className="text-cyan-400" /> Video Opacity
                          </span>
                          <span>{Math.round(videoOpacity * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.2"
                          max="1"
                          step="0.05"
                          value={videoOpacity}
                          onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
                          className="w-full accent-cyan-400 cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2 text-xs text-white/80">
                          <Eye size={14} className="text-cyan-400" />
                          <span>Show HUD core over video</span>
                        </div>
                        <button
                          type="button"
                          onClick={onToggleHud}
                          className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                            showHudOverVideo ? "bg-cyan-500" : "bg-white/20"
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full bg-white transition-transform ${
                              showHudOverVideo ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={onDeleteVideo}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold border border-red-500/20 transition-colors mt-2"
                      >
                        <Trash2 size={14} />
                        <span>Remove Video Avatar</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-cyan-500/30 hover:border-cyan-400/60 bg-cyan-500/5 hover:bg-cyan-500/10 rounded-xl p-5 text-center cursor-pointer transition-all group"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    {isSavingVideo ? (
                      <div className="flex flex-col items-center justify-center py-2 text-cyan-300">
                        <Loader2 size={24} className="animate-spin mb-2" />
                        <span className="text-xs font-medium">Saving video to IndexedDB...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-2">
                        <UploadCloud
                          size={28}
                          className="text-cyan-400 group-hover:scale-110 transition-transform mb-2"
                        />
                        <span className="text-sm font-semibold text-white mb-1">
                          Select or Drop Avatar Video Here
                        </span>
                        <span className="text-[11px] text-white/50 font-mono">
                          Saved permanently in browser storage
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
