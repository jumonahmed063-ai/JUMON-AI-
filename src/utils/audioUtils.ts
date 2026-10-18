// Resilient Audio playback & Speech Synthesis utilities for JUMON AI

function pcmToWavBlob(pcmData: Uint8Array, sampleRate = 24000, numChannels = 1): Blob {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const byteRate = sampleRate * numChannels * 2;
  const blockAlign = numChannels * 2;
  const dataSize = pcmData.length;

  // "RIFF"
  view.setUint32(0, 0x52494646, false);
  view.setUint32(4, 36 + dataSize, true);
  // "WAVE"
  view.setUint32(8, 0x57415645, false);
  // "fmt "
  view.setUint32(12, 0x666d7420, false);
  view.setUint32(16, 16, true); // PCM subchunk size
  view.setUint16(20, 1, true); // PCM format (1 = uncompressed)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample (16-bit)
  // "data"
  view.setUint32(36, 0x64617461, false);
  view.setUint32(40, dataSize, true);

  return new Blob([header, pcmData], { type: "audio/wav" });
}

export async function playPCM(
  base64Data: string,
  onVolumeChange?: (volume: number) => void
): Promise<void> {
  if (!base64Data) return;

  try {
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Check if it already has a RIFF/WAVE header
    let wavBlob: Blob;
    if (len >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
      wavBlob = new Blob([bytes], { type: "audio/wav" });
    } else {
      wavBlob = pcmToWavBlob(bytes, 24000, 1);
    }

    const audioUrl = URL.createObjectURL(wavBlob);
    const audio = new Audio(audioUrl);
    audio.preload = "auto";

    return new Promise<void>((resolve) => {
      let animId: number | null = null;
      let intervalId: any = null;
      let hasEnded = false;

      const cleanup = () => {
        if (hasEnded) return;
        hasEnded = true;
        if (animId) cancelAnimationFrame(animId);
        if (intervalId) clearInterval(intervalId);
        if (onVolumeChange) onVolumeChange(0);
        URL.revokeObjectURL(audioUrl);
        resolve();
      };

      audio.onended = cleanup;
      audio.onerror = (e) => {
        console.warn("Audio element playback error, falling back:", e);
        cleanup();
      };

      // Try connecting to Web Audio API for exact frequency visualization
      let audioCtx: AudioContext | null = null;
      try {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass && onVolumeChange) {
          audioCtx = new AudioCtxClass();
          if (audioCtx.state === "suspended") {
            audioCtx.resume().catch(() => {});
          }
          const source = audioCtx.createMediaElementSource(audio);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.65;
          source.connect(analyser);
          analyser.connect(audioCtx.destination);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          let smoothed = 0;

          const monitor = () => {
            if (hasEnded) return;
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            const endBin = Math.min(dataArray.length, 45);
            for (let i = 2; i < endBin; i++) sum += dataArray[i];
            const avg = sum / (endBin - 2);
            const rawVol = Math.min(1, Math.max(0, (avg - 12) / 95));
            smoothed += (rawVol - smoothed) * 0.35;
            onVolumeChange(smoothed);
            animId = requestAnimationFrame(monitor);
          };
          animId = requestAnimationFrame(monitor);
        }
      } catch (audioCtxErr) {
        // Fallback simulated volume modulation if AudioContext can't tap media element
        if (onVolumeChange) {
          intervalId = setInterval(() => {
            if (hasEnded) return;
            const simVol = 0.2 + Math.random() * 0.45;
            onVolumeChange(simVol);
          }, 80);
        }
      }

      // Start playback
      audio.play().catch((playErr) => {
        console.warn("Autoplay / Audio.play() rejected:", playErr);
        cleanup();
      });
    });
  } catch (error) {
    console.error("Error in playPCM:", error);
  }
}

export function speakWithBrowserFallback(
  text: string,
  onVolumeChange?: (volume: number) => void
): Promise<void> {
  return new Promise<void>((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve();
      return;
    }
    const cleanText = text.replace(/\*.*?\*/g, "").replace(/[#*`_~]/g, "").trim();
    if (!cleanText) {
      resolve();
      return;
    }

    try {
      // Resume if paused (Chrome/Android bug where speechSynthesis freezes)
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.pitch = 1.05;

      const pickVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        const isBengali = /[\u0980-\u09FF]/.test(cleanText);
        if (isBengali) {
          const bnVoice = voices.find((v) => v.lang.startsWith("bn"));
          if (bnVoice) utterance.voice = bnVoice;
        } else {
          const naturalVoice = voices.find(
            (v) =>
              v.lang.startsWith("en") &&
              (v.name.includes("Natural") ||
                v.name.includes("Female") ||
                v.name.includes("Zira") ||
                v.name.includes("Google US English") ||
                v.name.includes("Samantha"))
          );
          if (naturalVoice) utterance.voice = naturalVoice;
        }
      };

      pickVoice();

      let intervalId: any = null;
      let finished = false;

      const cleanup = () => {
        if (finished) return;
        finished = true;
        if (intervalId) clearInterval(intervalId);
        if (onVolumeChange) onVolumeChange(0);
        resolve();
      };

      if (onVolumeChange) {
        onVolumeChange(0.35);
        intervalId = setInterval(() => {
          if (finished) return;
          const simVol = 0.25 + Math.random() * 0.4;
          onVolumeChange(simVol);
        }, 100);
      }

      utterance.onend = cleanup;
      utterance.onerror = cleanup;

      // Chrome safeguard: force finish after safe timeout based on text length
      const timeoutMs = Math.max(3000, cleanText.length * 100);
      setTimeout(cleanup, timeoutMs);

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("speechSynthesis error:", e);
      resolve();
    }
  });
}
