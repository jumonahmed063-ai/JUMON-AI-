import React, { useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Film, UploadCloud, Trash2, CheckCircle2, Sliders, Eye, Loader2, Sparkles } from "lucide-react";

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoSrc: string | null;
  videoName: string | null;
  videoSize: number | null;
  videoOpacity: number;
  onOpacityChange: (val: number) => void;
  showHudOverVideo: boolean;
  onToggleHud: () => void;
  onUpload: (file: File) => Promise<void>;
  onDelete: () => Promise<void>;
  isSaving: boolean;
}

function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function VideoModal({
  isOpen,
  onClose,
  videoSrc,
  videoName,
  videoSize,
  videoOpacity,
  onOpacityChange,
  showHudOverVideo,
  onToggleHud,
  onUpload,
  onDelete,
  isSaving,
}: VideoModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("video/")) {
      onUpload(file);
    }
  };

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

        {/* Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-[#070e14] border border-cyan-500/30 rounded-2xl shadow-2xl p-6 text-white z-10 max-h-[90vh] overflow-y-auto scrollbar-hide"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <Film size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-wide">Avatar Video Settings</h3>
                <p className="text-xs text-white/50">Permanently saved to browser IndexedDB</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="py-5 space-y-5">
            {/* Status Card */}
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
                <div className="w-full h-36 rounded-lg overflow-hidden bg-black/60 relative border border-white/10 flex items-center justify-center">
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
                <div className="pt-2 space-y-4">
                  {/* Opacity Slider */}
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

                  {/* HUD Overlay toggle */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2 text-xs text-white/80">
                      <Eye size={14} className="text-cyan-400" />
                      <span>Show JUMON HUD core over video</span>
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
                </div>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto">
                  <Film size={20} />
                </div>
                <h4 className="text-sm font-semibold text-white">No Video Avatar Set</h4>
                <p className="text-xs text-white/60 max-w-xs mx-auto">
                  Upload any video (.mp4, .webm) to display as an anime/cybernetic background. It will be permanently saved in your browser.
                </p>
              </div>
            )}

            {/* Upload / Replace Area */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-cyan-500/30 hover:border-cyan-400/60 bg-cyan-500/5 hover:bg-cyan-500/10 rounded-xl p-6 text-center cursor-pointer transition-all group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleFileChange}
              />
              {isSaving ? (
                <div className="flex flex-col items-center justify-center py-2 text-cyan-300">
                  <Loader2 size={28} className="animate-spin mb-2" />
                  <span className="text-xs font-medium">Saving video permanently to browser storage...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-2">
                  <UploadCloud
                    size={32}
                    className="text-cyan-400 group-hover:scale-110 transition-transform mb-2"
                  />
                  <span className="text-sm font-semibold text-white mb-1">
                    {videoSrc ? "Choose Another Video to Replace" : "Select or Drop Video File Here"}
                  </span>
                  <span className="text-[11px] text-white/50 font-mono">
                    Supports MP4, WebM, MOV • Preserved across reloads & sessions
                  </span>
                </div>
              )}
            </div>

            {/* Permanent storage guarantee info */}
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300/90 leading-relaxed">
              <Sparkles size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong>Permanent Storage:</strong> The video is stored locally in your browser's IndexedDB. Even if you refresh the page or close your browser, your chosen avatar video will automatically load.
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3">
            {videoSrc ? (
              <button
                type="button"
                onClick={onDelete}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold border border-red-500/20 transition-colors"
              >
                <Trash2 size={14} />
                <span>Remove Video</span>
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-600 hover:to-violet-600 text-white text-xs font-semibold transition-all shadow-lg shadow-cyan-500/20"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
