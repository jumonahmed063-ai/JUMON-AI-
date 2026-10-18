import { motion } from "motion/react";

type VisualizerState = "idle" | "listening" | "processing" | "speaking";

interface VisualizerProps {
  state: VisualizerState;
  volume?: number;
}

export default function Visualizer({ state, volume = 0 }: VisualizerProps) {
  const clampedVolume = state === "speaking" ? Math.min(1, Math.max(0, volume)) : 0;

  const getRingAnimation = (index: number, reverse: boolean = false) => {
    const baseSpeed = state === "listening" ? 3 : state === "processing" ? 1.5 : state === "speaking" ? 2 : 15;
    return {
      rotate: reverse ? [-360, 0] : [0, 360],
      transition: { duration: baseSpeed + index * 2, repeat: Infinity, ease: "linear" }
    };
  };

  const getPulseAnimation = () => {
    if (state === "speaking") {
      return {
        scale: [1, 1.05, 0.98, 1.02, 1],
        opacity: [0.8, 1, 0.8, 1, 0.8],
        transition: { duration: 0.5, repeat: Infinity, ease: "easeInOut" }
      };
    }
    if (state === "listening") {
      return {
        scale: [1, 1.02, 1],
        opacity: [0.7, 1, 0.7],
        transition: { duration: 1, repeat: Infinity, ease: "easeInOut" }
      };
    }
    if (state === "processing") {
      return {
        scale: [0.98, 1.02, 0.98],
        opacity: [0.6, 0.9, 0.6],
        transition: { duration: 0.8, repeat: Infinity, ease: "linear" }
      };
    }
    return {
      scale: [1, 1.01, 1],
      opacity: [0.4, 0.6, 0.4],
      transition: { duration: 4, repeat: Infinity, ease: "easeInOut" }
    };
  };

  // JARVIS color palette (Cyan/Blue) with Zoya's personality (Violet/Pink hints)
  const getTheme = () => {
    switch (state) {
      case "listening": return { color: "rgba(139, 92, 246, 1)", glow: "shadow-violet-500/60", border: "border-violet-400" };
      case "processing": return { color: "rgba(56, 189, 248, 1)", glow: "shadow-sky-400/80", border: "border-sky-400" };
      case "speaking": return { color: "rgba(236, 72, 153, 1)", glow: "shadow-pink-500/80", border: "border-pink-400" };
      default: return { color: "rgba(6, 182, 212, 0.8)", glow: "shadow-cyan-500/40", border: "border-cyan-500/50" }; // Cyan for idle
    }
  };

  const theme = getTheme();

  return (
    <div 
      id="visualizer-container"
      className="relative w-full h-full max-w-[650px] max-h-[650px] flex items-center justify-center overflow-visible pointer-events-none select-none transition-all duration-100 ease-out"
      style={{
        filter: state === "speaking" 
          ? `drop-shadow(0 0 ${10 + clampedVolume * 24}px ${theme.color})` 
          : undefined,
      }}
    >
      {/* Subtle Container Ambient Glow - Pulses dynamically in sync with audio volume when speaking */}
      <div
        id="visualizer-volume-glow"
        className="absolute w-[80%] h-[80%] rounded-full blur-[85px] pointer-events-none transition-all duration-75 ease-out"
        style={{
          backgroundColor: theme.color,
          opacity: state === "speaking" ? 0.2 + clampedVolume * 0.45 : 0.15,
          transform: state === "speaking" ? `scale(${1 + clampedVolume * 0.22})` : undefined,
        }}
      />

      {/* Synchronized Outer Perimeter Aura Ring during speech */}
      {state === "speaking" && (
        <div
          id="visualizer-volume-ring"
          className="absolute w-[92%] h-[92%] rounded-full pointer-events-none transition-all duration-75 ease-out"
          style={{
            border: `1px solid ${theme.color}`,
            opacity: 0.18 + clampedVolume * 0.52,
            transform: `scale(${1 + clampedVolume * 0.14})`,
            boxShadow: `0 0 ${16 + clampedVolume * 32}px ${theme.color}, inset 0 0 ${12 + clampedVolume * 22}px ${theme.color}`,
          }}
        />
      )}

      {/* Ambient Mid Glow */}
      <motion.div
        animate={state !== "speaking" ? getPulseAnimation() : undefined}
        className={`absolute w-[60%] h-[60%] rounded-full blur-[70px] ${theme.glow} transition-all duration-75 ease-out`}
        style={{ 
          backgroundColor: theme.color, 
          opacity: state === "speaking" ? 0.22 + clampedVolume * 0.48 : 0.15,
          transform: state === "speaking" ? `scale(${1 + clampedVolume * 0.18})` : undefined,
        }}
      />

      {/* Ring 1: Massive Outer Dashed */}
      <motion.div
        animate={getRingAnimation(4, false)}
        className={`absolute w-[100%] h-[100%] rounded-full border-[1px] border-dashed ${theme.border} opacity-20 transition-all duration-75 ease-out`}
        style={{
          transform: state === "speaking" ? `scale(${1 + clampedVolume * 0.06})` : undefined,
          opacity: state === "speaking" ? 0.2 + clampedVolume * 0.25 : 0.2,
        }}
      />

      {/* Ring 2: Segmented Thick Ring */}
      <motion.div
        animate={getRingAnimation(3, true)}
        className={`absolute w-[85%] h-[85%] rounded-full border-[2px] border-dotted ${theme.border} opacity-30 transition-all duration-75 ease-out`}
        style={{
          transform: state === "speaking" ? `scale(${1 + clampedVolume * 0.08})` : undefined,
          opacity: state === "speaking" ? 0.3 + clampedVolume * 0.3 : 0.3,
        }}
      />

      {/* Ring 3: Scanner Ring (Solid with gaps) */}
      <motion.div
        animate={getRingAnimation(2, false)}
        className={`absolute w-[70%] h-[70%] rounded-full border-[1px] ${theme.border} border-t-transparent border-b-transparent opacity-40 transition-all duration-75 ease-out`}
        style={{
          transform: state === "speaking" ? `scale(${1 + clampedVolume * 0.09})` : undefined,
          opacity: state === "speaking" ? 0.4 + clampedVolume * 0.35 : 0.4,
        }}
      />

      {/* Ring 4: Inner Dashed */}
      <motion.div
        animate={getRingAnimation(1, true)}
        className={`absolute w-[55%] h-[55%] rounded-full border-[2px] border-dashed ${theme.border} opacity-50 transition-all duration-75 ease-out`}
        style={{
          transform: state === "speaking" ? `scale(${1 + clampedVolume * 0.07})` : undefined,
          opacity: state === "speaking" ? 0.5 + clampedVolume * 0.35 : 0.5,
        }}
      />
      
      {/* Ring 5: Core HUD Ring */}
      <motion.div
        animate={getRingAnimation(0, false)}
        className={`absolute w-[40%] h-[40%] rounded-full border-[4px] border-dotted ${theme.border} opacity-70 transition-all duration-75 ease-out`}
        style={{
          transform: state === "speaking" ? `scale(${1 + clampedVolume * 0.06})` : undefined,
          opacity: state === "speaking" ? 0.7 + clampedVolume * 0.3 : 0.7,
        }}
      />

      {/* Core Circle */}
      <motion.div
        animate={state !== "speaking" ? getPulseAnimation() : undefined}
        className={`absolute w-[25%] h-[25%] rounded-full border-[1px] ${theme.border} bg-black/40 backdrop-blur-md flex items-center justify-center transition-all duration-75 ease-out ${
          state === "processing" ? "avatar-pulse-thinking" : state === "speaking" ? "avatar-pulse-speaking" : ""
        }`}
        style={{ 
          transform: state === "speaking" ? `scale(${1 + clampedVolume * 0.08})` : undefined,
          boxShadow: state === "speaking"
            ? `0 0 ${35 + clampedVolume * 45}px ${theme.color}, inset 0 0 ${25 + clampedVolume * 30}px ${theme.color}`
            : state === "processing"
            ? `0 0 50px ${theme.color}, inset 0 0 35px ${theme.color}`
            : `0 0 40px ${theme.color}, inset 0 0 30px ${theme.color}` 
        }}
      >
        {/* Center Text */}
        <div 
          className="font-bold tracking-[0.3em] text-xl md:text-3xl lg:text-4xl text-white transition-all duration-75 ease-out"
          style={{ 
            textShadow: state === "speaking"
              ? `0 0 ${12 + clampedVolume * 24}px ${theme.color}, 0 0 ${26 + clampedVolume * 36}px ${theme.color}`
              : state === "processing"
              ? `0 0 18px ${theme.color}, 0 0 36px ${theme.color}`
              : `0 0 15px ${theme.color}, 0 0 30px ${theme.color}` 
          }}
        >
          JUMON
        </div>
      </motion.div>
    </div>
  );
}
