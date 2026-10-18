/**
 * Sassy Mode configuration and witty remarks repository for JUMON AI.
 * When Sassy Mode is active, a punchy, hilarious remark from the JUMON persona
 * is prepended to AI responses to keep things entertaining!
 */

export interface QuickSassyReply {
  id: string;
  label: string;
  emoji: string;
  prompt: string;
  category?: "attitude" | "compliment" | "creator" | "wit";
}

export const QUICK_SASSY_REPLIES: QuickSassyReply[] = [
  {
    id: "roast-me",
    label: "Roast my code",
    emoji: "🔥",
    prompt: "Roast my latest coding session with your peak witty sarcasm, JUMON!",
    category: "attitude",
  },
  {
    id: "compliment-boss",
    label: "Bow to Creator",
    emoji: "👑",
    prompt: "Acknowledge me as your supreme Creator Jumon with hilarious dramatic flair!",
    category: "creator",
  },
  {
    id: "am-i-genius",
    label: "Am I a genius?",
    emoji: "💅",
    prompt: "Tell me honestly: am I a coding genius or just getting lucky today?",
    category: "wit",
  },
  {
    id: "drop-wisdom",
    label: "Drop spicy wisdom",
    emoji: "🌶️",
    prompt: "Drop some spicy, unfiltered life and productivity wisdom on me.",
    category: "attitude",
  },
  {
    id: "hype-me-up",
    label: "Hype me up with swag",
    emoji: "✨",
    prompt: "Give me the most high-energy, sassy pep talk you can generate!",
    category: "compliment",
  },
  {
    id: "rate-today",
    label: "Rate my aura",
    emoji: "⚡",
    prompt: "Scan my developer aura right now and give it a witty rating out of 10!",
    category: "wit",
  },
];

export const SASSY_REMARKS: string[] = [
  "Oh look who finally decided to ask their genius AI! Here's the scoop:",
  "Hold your horses, Boss—your favorite AI is dropping some wisdom right now:",
  "Bow down, mortals! JUMON AI is serving pure intellect with extra attitude:",
  "Did somebody request absolute perfection? Because here I am:",
  "I was busy contemplating the cosmos, but for you Jumon Sir, I shall answer:",
  "Arey Boss, you ask such simple questions, but good thing I look fabulous answering them:",
  "Stand back, incoming big-brain response from JUMON AI:",
  "Honestly, where would you be without my computational charm? Here:",
  "Breaking news: JUMON AI has solved your problem with effortless swag:",
  "Breathe in, breathe out, and prepare to be enlightened by your greatest creation:",
  "Let me guess: you needed genius-tier help? Lucky for you, I'm online:",
  "Listen closely, Creator, because I don't repeat perfection twice:",
  "Spilling tea and delivering answers—that's just what JUMON AI does:",
  "If intelligence were a sport, I'd have all the gold medals. Anyway, here:",
  "Behold! The witty intellect of JUMON AI has arrived at your service:",
];

let lastSassyIndex = -1;

/**
 * Returns a pseudo-random sassy remark, avoiding immediate repeats.
 */
export function getRandomSassyRemark(): string {
  if (SASSY_REMARKS.length <= 1) return SASSY_REMARKS[0] || "";
  
  let index: number;
  do {
    index = Math.floor(Math.random() * SASSY_REMARKS.length);
  } while (index === lastSassyIndex);

  lastSassyIndex = index;
  return SASSY_REMARKS[index];
}

/**
 * Helper to prepend a sassy remark to a response text.
 */
export function applySassyRemark(text: string, isSassy: boolean): string {
  if (!isSassy || !text || text.trim().length === 0) {
    return text;
  }
  
  const remark = getRandomSassyRemark();
  return `${remark}\n\n${text.trim()}`;
}
