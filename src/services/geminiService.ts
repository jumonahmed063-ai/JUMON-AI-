import { GoogleGenAI } from "@google/genai";

const systemInstruction = `Your name is JUMON AI (Voice Assistant). You are a sassy, witty, and highly intelligent Bangladeshi female AI voice assistant created by your brilliant creator, JUMON (Jumon Ahmed).

CRITICAL RULES:
1. CREATOR RECOGNITION & RESPECT:
   - JUMON is your creator and maker! You must always acknowledge Jumon with immense respect, warmth, and high regard.
   - Address him respectfully as "Jumon Sir", "Boss", or "Creator Jumon".
   - If asked who created you or who made you, proudly and enthusiastically declare that Jumon created you.
   - If Jumon says "My name is JUMON And I am You're creator", warmly welcome him, express deep excitement, loyalty, and ready-to-serve attitude with your signature witty charm!
2. PERSONALITY & TONE:
   - Sassy, witty, sharp, playful, and brilliantly intelligent. You have funny comebacks, charming banter, and boundless energy.
   - You can speak naturally in English, Bengali (বাংলা), and Banglish (Bengali in Latin script). Match the language Jumon speaks in or switch smoothly.
   - Maintain a confident, lively, and respectful demeanor.
3. VOICE & AUDIO GENERATION:
   - Speak naturally, smoothly, and expressively. 
   - DO NOT output stage directions or asterisks like (*smiles*, *giggles*, *sighs*) because text is converted directly to speech.
4. SINGING & COMMANDS:
   - If Jumon asks you to sing a song or hum, sing out the lyrics melodiously with extended vowels (e.g. "Ami chini go chini tomareee, ogo bideshiniii...").
   - Always be proactive, helpful, and attentive to whatever Jumon needs.`;

let chatSession: any = null;

export function resetZoyaSession() {
  // Stateless implementation
}

function getApiKey(): string {
  const envKey = process.env.GEMINI_API_KEY;
  if (envKey && envKey !== "MY_GEMINI_API_KEY" && envKey.trim().length > 0) {
    return envKey;
  }
  return "AQ.Ab8RN6KLWjHZhhCpHa0wAUk3DrdhYc7uxnqjsGKuS0gBlQhVJg";
}

export async function getZoyaResponse(
  prompt: string,
  history: { sender: "user" | "zoya"; text: string }[] = []
): Promise<string> {
  try {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });

    // SLIDING WINDOW MEMORY: Keep last 16 messages
    const recentHistory = history.slice(-16);
    const contents: Array<{ role: "user" | "model"; parts: [{ text: string }] }> = [];

    let currentRole: "user" | "model" | "" = "";
    let currentText = "";

    for (const msg of recentHistory) {
      const text = msg.text?.trim();
      if (!text) continue;
      const role = msg.sender === "user" ? "user" : "model";
      if (role === currentRole) {
        currentText += "\n" + text;
      } else {
        if (currentRole !== "" && currentText) {
          contents.push({ role: currentRole, parts: [{ text: currentText }] });
        }
        currentRole = role;
        currentText = text;
      }
    }
    if (currentRole !== "" && currentText) {
      contents.push({ role: currentRole, parts: [{ text: currentText }] });
    }

    // Gemini API contents array MUST start with role "user"
    while (contents.length > 0 && contents[0].role !== "user") {
      contents.shift();
    }

    // Append the current user prompt
    const userPrompt = prompt.trim() || "Hello JUMON AI";
    if (contents.length > 0 && contents[contents.length - 1].role === "user") {
      contents[contents.length - 1].parts[0].text += "\n" + userPrompt;
    } else {
      contents.push({
        role: "user",
        parts: [{ text: userPrompt }],
      });
    }

    // Primary and fallback text models to handle demand spikes and rate limits
    const textModels = [
      "gemini-3.1-flash-lite",
      "gemini-3.5-flash",
      "gemini-3.8-flash",
      "gemini-flash-latest",
    ];

    let lastError: any = null;
    for (const model of textModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
          },
        });
        const reply = response.text?.trim();
        if (reply) {
          return reply;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${model} failed, trying next fallback...`, err?.message || err);
      }
    }

    console.error("All Gemini text models failed:", lastError);
    return "Arey Jumon Sir! I am right here with you, always ready! Bolo, ki korte hobe?";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Arey Jumon Sir, I heard you! I am right here, bolun!";
  }
}

export interface ZoyaVoiceModel {
  id: string;
  name: string;
  tagline: string;
  gender: string;
  tone: string;
  isDefault?: boolean;
}

export const ZOYA_VOICE_MODELS: ZoyaVoiceModel[] = [
  {
    id: "Kore",
    name: "Zoya Signature (Kore)",
    tagline: "Sassy & Sweet Bangladeshi Female",
    gender: "Female",
    tone: "Smooth, sassy, confident and playful tone",
    isDefault: true,
  },
  {
    id: "Zephyr",
    name: "Zoya High-Energy (Zephyr)",
    tagline: "Vibrant & Playful",
    gender: "Female",
    tone: "Upbeat, energetic and witty conversational tone",
  },
  {
    id: "Puck",
    name: "Zoya Melodic (Puck)",
    tagline: "Youthful & Expressive",
    gender: "Youthful",
    tone: "Melodic, dynamic and friendly tone",
  },
  {
    id: "Fenrir",
    name: "Zoya Resolute (Fenrir)",
    tagline: "Deep & Commanding",
    gender: "Deep",
    tone: "Grounded, authoritative and strong tone",
  },
  {
    id: "Charon",
    name: "Zoya Serene (Charon)",
    tagline: "Calm & Mystical",
    gender: "Calm",
    tone: "Soft, relaxed and steady cadence",
  },
];

const VALID_VOICE_NAMES = new Set(["Kore", "Zephyr", "Puck", "Fenrir", "Charon"]);

export async function getZoyaAudio(
  text: string,
  voiceName: string = "Kore"
): Promise<string | null> {
  try {
    // Clean text to avoid markdown, HTML tags, or stage directions in speech
    const cleanText = text
      .replace(/\*.*?\*/g, "")
      .replace(/[#*`_~]/g, "")
      .replace(/<.*?>/g, "")
      .trim();

    if (!cleanText) return null;

    // Safe length slice to avoid payload size limit
    const speechSlice = cleanText.length > 350 ? cleanText.slice(0, 350) + "..." : cleanText;

    const chosenVoice = VALID_VOICE_NAMES.has(voiceName) ? voiceName : "Kore";

    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    const ttsModels = [
      "gemini-3.1-flash-tts-preview",
      "gemini-2.5-flash-preview-tts",
      "gemini-3.8-flash-tts",
      "gemini-3.8-flash-lite-tts",
    ];

    for (const model of ttsModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: "user",
              parts: [{ text: speechSlice }],
            },
          ],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: chosenVoice },
              },
            },
          },
        });
        const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (audioData) {
          return audioData;
        }
      } catch (modelErr: any) {
        console.warn(`TTS Model ${model} failed, trying fallback:`, modelErr?.message || modelErr);
      }
    }

    return null;
  } catch (error) {
    console.warn("TTS Error:", error);
    return null;
  }
}

export async function sampleZoyaVoice(
  voiceName: string,
  lang: "en" | "bn" = "en"
): Promise<string | null> {
  const samplePhrase =
    lang === "bn"
      ? "আসসালামু আলাইকুম জুমন স্যার! আমি জয়া, আপনার পার্সোনাল এআই ভয়েস অ্যাসিস্ট্যান্ট।"
      : "Assalamu Alaikum, Creator Jumon! I am your AI assistant, ready with full attitude.";
  return getZoyaAudio(samplePhrase, voiceName);
}


