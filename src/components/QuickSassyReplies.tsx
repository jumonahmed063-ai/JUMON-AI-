import React from "react";
import { Sparkles, Flame, Crown, Zap, MessageSquareQuote } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { QUICK_SASSY_REPLIES, QuickSassyReply } from "../utils/sassyMode";

interface QuickSassyRepliesProps {
  onSelectReply: (reply: QuickSassyReply) => void;
  disabled?: boolean;
  variant?: "inline" | "drawer";
}

export default function QuickSassyReplies({
  onSelectReply,
  disabled = false,
  variant = "inline",
}: QuickSassyRepliesProps) {
  if (variant === "drawer") {
    return (
      <div className="pt-3 pb-2 border-t border-white/10">
        <div className="flex items-center gap-1.5 px-1 mb-2">
          <Flame size={14} className="text-pink-400 animate-pulse" />
          <span className="text-[11px] font-mono uppercase tracking-wider text-pink-300 font-semibold">
            Quick Sassy Replies
          </span>
          <span className="text-[10px] text-pink-400/70 font-mono">One-tap</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {QUICK_SASSY_REPLIES.map((reply) => (
            <button
              key={reply.id}
              onClick={() => onSelectReply(reply)}
              disabled={disabled}
              className="flex items-center gap-2 p-2 rounded-xl bg-gradient-to-r from-pink-500/10 to-purple-500/10 hover:from-pink-500/20 hover:to-purple-500/20 border border-pink-500/25 hover:border-pink-400/50 text-left text-xs text-pink-100 transition-all disabled:opacity-40 active:scale-[0.98] group"
              title={reply.prompt}
            >
              <span className="text-base shrink-0 group-hover:scale-110 transition-transform">
                {reply.emoji}
              </span>
              <div className="truncate">
                <span className="font-medium text-[11px] block leading-tight text-pink-100">
                  {reply.label}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      className="w-full flex items-center justify-center px-4"
    >
      <div className="flex items-center gap-2 overflow-x-auto max-w-2xl py-1 px-2 scrollbar-hide bg-gradient-to-r from-pink-950/40 via-purple-950/30 to-pink-950/40 border border-pink-500/30 rounded-2xl backdrop-blur-xl shadow-lg shadow-pink-950/40">
        <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-pink-300 px-1 shrink-0 uppercase tracking-wider">
          <Flame size={13} className="text-pink-400 animate-pulse" />
          <span className="hidden sm:inline">Sassy:</span>
        </div>

        {QUICK_SASSY_REPLIES.map((reply) => (
          <button
            key={reply.id}
            onClick={() => onSelectReply(reply)}
            disabled={disabled}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-500/15 hover:bg-pink-500/30 active:scale-95 border border-pink-400/30 hover:border-pink-400/60 text-[12px] font-medium text-pink-100 whitespace-nowrap transition-all shadow-sm hover:shadow-pink-500/20 disabled:opacity-40"
            title={reply.prompt}
          >
            <span>{reply.emoji}</span>
            <span>{reply.label}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
