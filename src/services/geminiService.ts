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
  chatSession = null;
}

export async function getZoyaResponse(prompt: string, history: { sender: "user" | "zoya", text: string }[] = []): Promise<string> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    if (!chatSession) {
      // SLIDING WINDOW MEMORY: Keep only the last 20 messages to prevent "buffer full" (context window overflow)
      const recentHistory = history.slice(-20);
      
      let formattedHistory: any[] = [];
      let currentRole = "";
      let currentText = "";

      for (const msg of recentHistory) {
        const role = msg.sender === "user" ? "user" : "model";
        if (role === currentRole) {
          currentText += "\n" + msg.text;
        } else {
          if (currentRole !== "") {
            formattedHistory.push({ role: currentRole, parts: [{ text: currentText }] });
          }
          currentRole = role;
          currentText = msg.text;
        }
      }
      if (currentRole !== "") {
        formattedHistory.push({ role: currentRole, parts: [{ text: currentText }] });
      }

      if (formattedHistory.length > 0 && formattedHistory[0].role !== "user") {
        formattedHistory.shift();
      }

      chatSession = ai.chats.create({
        model: "gemini-3.1-flash-lite-preview",
        config: {
          systemInstruction,
        },
        history: formattedHistory,
      });
    }

    const response = await chatSession.sendMessage({ message: prompt });
    return response.text || "Ugh, fine. I have nothing to say.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Oops, kichu ekta somossa hoyeche! Please try again in a moment, Jumon Sir.";
  }
}

export async function getZoyaAudio(text: string): Promise<string | null> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Aoede" },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
}

