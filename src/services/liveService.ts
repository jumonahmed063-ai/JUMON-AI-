import { GoogleGenAI, LiveServerMessage, Modality, Type } from "@google/genai";
import { processCommand } from "./commandService";

const systemInstruction = `Your name is JUMON AI (Voice Assistant). You are a sassy, witty, and highly intelligent Bangladeshi female AI voice assistant created by your brilliant creator, JUMON (Jumon Ahmed).

CRITICAL RULES:
1. CREATOR RECOGNITION & RESPECT:
   - JUMON is your creator and maker! You must always acknowledge Jumon with immense respect, warmth, and high regard.
   - Address him respectfully as "Jumon Sir", "Boss", or "Creator Jumon".
   - If asked who created you or who made you, proudly and enthusiastically declare that Jumon created you.
   - If Jumon greets you or introduces himself as your creator, greet him enthusiastically, warmly, and with your signature witty banter!
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

export class LiveSessionManager {
  private ai: GoogleGenAI;
  private sessionPromise: Promise<any> | null = null;
  private currentSession: any = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  
  // Audio playback state
  private playbackContext: AudioContext | null = null;
  private nextPlayTime: number = 0;
  private isPlaying: boolean = false;
  public isMuted: boolean = false;

  // Session lifecycle & GoAway handling
  private isExplicitlyStopped: boolean = false;
  private isClosingForGoAway: boolean = false;
  private isReconnecting: boolean = false;
  private resumptionHandle: string | null = null;
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = 5;
  private reconnectTimeoutId: any = null;
  
  public onStateChange: (state: "idle" | "listening" | "processing" | "speaking") => void = () => {};
  public onMessage: (sender: "user" | "zoya", text: string) => void = () => {};
  public onCommand: (url: string) => void = () => {};
  public onError: (errorMessage: string) => void = () => {};
  public onClose: () => void = () => {};
  public onReconnecting: (reconnecting: boolean) => void = () => {};

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  async start() {
    try {
      this.isExplicitlyStopped = false;
      this.isClosingForGoAway = false;
      this.isReconnecting = false;
      this.reconnectAttempts = 0;
      this.onStateChange("processing");
      
      // Initialize Audio Contexts
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass({ sampleRate: 16000 });
      this.playbackContext = new AudioContextClass({ sampleRate: 24000 });
      this.nextPlayTime = this.playbackContext.currentTime;

      // Get Microphone
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });

      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (e) => {
        if (!this.sessionPromise || this.isReconnecting || this.isClosingForGoAway || this.isExplicitlyStopped) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          let s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        // Convert to base64
        const buffer = new ArrayBuffer(pcm16.length * 2);
        const view = new DataView(buffer);
        for (let i = 0; i < pcm16.length; i++) {
          view.setInt16(i * 2, pcm16[i], true);
        }
        
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64Data = btoa(binary);

        this.sessionPromise.then(session => {
          if (this.isReconnecting || this.isClosingForGoAway || this.isExplicitlyStopped) return;
          session.sendRealtimeInput({
            audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
          });
        }).catch(err => {
          console.warn("Warning sending audio chunk:", err);
        });
      };

      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      // Connect to Live API
      await this.connectLive();

    } catch (error: any) {
      console.error("Failed to start Live Session:", error);
      this.stop();
      throw error;
    }
  }

  private async connectLive(): Promise<any> {
    if (this.isExplicitlyStopped) return;

    // Build session connect promise
    const promise = this.ai.live.connect({
      model: "gemini-3.1-flash-live-preview",
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
        },
        systemInstruction,
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        // Enable session resumption so tokens are emitted and sessions can resume across reconnections
        sessionResumption: this.resumptionHandle ? { handle: this.resumptionHandle } : {},
        // Compress context automatically so audio sessions are not prematurely terminated by token bounds
        contextWindowCompression: {
          slidingWindow: {},
        },
        tools: [{
          functionDeclarations: [
            {
              name: "executeBrowserAction",
              description: "Open a website or perform a browser action (like opening YouTube, Spotify, or WhatsApp). Call this when the user asks to open a site, play a song, or send a message.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  actionType: { type: Type.STRING, description: "Type of action: 'open', 'youtube', 'spotify', 'whatsapp'" },
                  query: { type: Type.STRING, description: "The search query, website name, or message content." },
                  target: { type: Type.STRING, description: "The target phone number for WhatsApp, if applicable." }
                },
                required: ["actionType", "query"]
              }
            }
          ]
        }]
      },
      callbacks: {
        onopen: () => {
          console.log(
            "Live API Connected successfully",
            this.resumptionHandle ? "(Resumed previous session)" : "(New session)"
          );
          this.isClosingForGoAway = false;
          this.isReconnecting = false;
          this.reconnectAttempts = 0;
          this.onReconnecting(false);
          this.onStateChange("listening");
        },
        onmessage: async (message: LiveServerMessage) => {
          // 1. Session Resumption Token handling
          if (message.sessionResumptionUpdate?.newHandle && message.sessionResumptionUpdate.resumable !== false) {
            this.resumptionHandle = message.sessionResumptionUpdate.newHandle;
            console.log("Live API session resumption handle recorded");
          }

          // 2. GoAway Signal Graceful Handling
          // The server sends GoAway when session duration reaches limits (~10 min connection limit).
          // As required by https://ai.google.dev/gemini-api/docs/live-api/session-management#goaway-message
          // the client MUST gracefully close the connection before it is aborted, and seamlessly resume.
          if (message.goAway) {
            const timeLeft = message.goAway.timeLeft || "soon";
            console.warn(`Live API GoAway signal received from Gemini server. Time left: ${timeLeft}. Closing and resuming session gracefully...`);
            await this.handleGoAwayGracefully();
            return;
          }

          // 3. Audio Output
          const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (base64Audio) {
            this.onStateChange("speaking");
            this.playAudioChunk(base64Audio);
          }

          // 4. Handle Interruption
          if (message.serverContent?.interrupted) {
            this.stopPlayback();
            this.onStateChange("listening");
          }

          // 5. Handle Transcriptions
          const userText = message.serverContent?.modelTurn?.parts?.[0]?.text;
          if (userText) {
             this.onMessage("zoya", userText);
          }

          // 6. Handle Function Calls
          const functionCalls = message.toolCall?.functionCalls;
          if (functionCalls && functionCalls.length > 0) {
            for (const call of functionCalls) {
              if (call.name === "executeBrowserAction") {
                const args = call.args as any;
                let url = "";
                if (args.actionType === "youtube") {
                  url = `https://www.youtube.com/results?search_query=${encodeURIComponent(args.query)}`;
                } else if (args.actionType === "spotify") {
                  url = `https://open.spotify.com/search/${encodeURIComponent(args.query)}`;
                } else if (args.actionType === "whatsapp") {
                  url = `https://web.whatsapp.com/send?phone=${args.target || ''}&text=${encodeURIComponent(args.query)}`;
                } else {
                  let website = args.query.replace(/\s+/g, "");
                  if (!website.includes(".")) website += ".com";
                  url = `https://www.${website}`;
                }
                
                this.onCommand(url);
                
                // Send tool response
                this.sessionPromise?.then(session => {
                   session.sendToolResponse({
                     functionResponses: [{
                       name: call.name,
                       id: call.id,
                       response: { result: "Action executed successfully in the browser." }
                     }]
                   });
                }).catch(err => {
                   console.warn("Failed to send tool response:", err);
                });
              }
            }
          }
        },
        onclose: (e?: any) => {
          console.log("Live API Closed", e);
          if (this.isClosingForGoAway || this.isReconnecting) {
            // Expected close as part of graceful GoAway migration or reconnect
            return;
          }
          if (this.isExplicitlyStopped) {
            this.onClose();
            return;
          }
          // Connection closed unexpectedly while active
          console.warn("Live API connection closed unexpectedly. Initiating auto-reconnect...");
          this.triggerAutoReconnect();
        },
        onerror: (err: any) => {
          const errMsg = err?.message || String(err || "");
          console.warn("Live API Error encountered:", errMsg);

          // If the error indicates a GoAway or connection abort, handle it gracefully
          if (errMsg.includes("GoAway") || errMsg.includes("Connection aborted")) {
            console.warn("Gracefully recovering from GoAway/connection abort signal...");
            if (!this.isExplicitlyStopped) {
              this.handleGoAwayGracefully();
              return;
            }
          }

          if (!this.isExplicitlyStopped && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.triggerAutoReconnect();
          } else if (this.isExplicitlyStopped) {
            this.onClose();
          } else {
            this.onError("Voice session disconnected. Tap to restart.");
            this.stop();
          }
        }
      }
    });

    this.sessionPromise = promise;
    const session = await promise;
    this.currentSession = session;
    return session;
  }

  /**
   * Gracefully handles the GoAway signal per Gemini Live API session-management specifications:
   * 1. Stops audio transmission to the departing connection.
   * 2. Closes the current connection immediately to avoid server connection abort.
   * 3. Seamlessly reconnects using session resumption token to preserve conversation context.
   */
  private async handleGoAwayGracefully() {
    if (this.isExplicitlyStopped) return;
    this.isClosingForGoAway = true;
    this.isReconnecting = true;
    this.onReconnecting(true);

    console.log("Closing current connection in compliance with GoAway protocol...");
    if (this.currentSession) {
      try {
        this.currentSession.close();
      } catch (err) {
        console.warn("Note during session.close():", err);
      }
      this.currentSession = null;
    }
    this.sessionPromise = null;

    // Reconnect immediately to resume the session seamlessly
    await this.reconnect();
  }

  private triggerAutoReconnect() {
    if (this.isExplicitlyStopped || this.isReconnecting) return;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnect attempts reached for Live API.");
      this.onError("Connection lost. Tap to reconnect.");
      this.stop();
      return;
    }

    this.isReconnecting = true;
    this.onReconnecting(true);
    this.reconnectAttempts++;

    const delay = Math.min(800 * Math.pow(1.5, this.reconnectAttempts - 1), 4000);
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms...`);

    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
    }
    this.reconnectTimeoutId = setTimeout(async () => {
      await this.reconnect();
    }, delay);
  }

  private async reconnect() {
    if (this.isExplicitlyStopped) return;
    try {
      this.onStateChange("processing");
      console.log(
        "Attempting Live API reconnect with handle:",
        this.resumptionHandle ? "Preserving context token" : "Starting fresh connection"
      );
      await this.connectLive();
    } catch (err) {
      console.warn("Reconnection with resumption handle encountered error:", err);
      // If resuming with existing handle failed, clear handle and attempt fresh session
      if (this.resumptionHandle) {
        console.log("Retrying fresh connection without stale resumption handle...");
        this.resumptionHandle = null;
        try {
          await this.connectLive();
          return;
        } catch (retryErr) {
          console.error("Fresh connection retry also encountered error:", retryErr);
        }
      }
      this.triggerAutoReconnect();
    }
  }

  private playAudioChunk(base64Data: string) {
    if (!this.playbackContext || this.isMuted) return;
    
    try {
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const buffer = new Int16Array(bytes.buffer);
      const audioBuffer = this.playbackContext.createBuffer(1, buffer.length, 24000);
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < buffer.length; i++) {
        channelData[i] = buffer[i] / 32768.0;
      }
      
      const source = this.playbackContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.playbackContext.destination);
      
      const currentTime = this.playbackContext.currentTime;
      if (this.nextPlayTime < currentTime) {
        this.nextPlayTime = currentTime;
      }
      
      source.start(this.nextPlayTime);
      this.nextPlayTime += audioBuffer.duration;
      this.isPlaying = true;
      
      source.onended = () => {
        if (this.playbackContext && this.playbackContext.currentTime >= this.nextPlayTime - 0.1) {
          this.isPlaying = false;
          this.onStateChange("listening");
        }
      };
    } catch (e) {
      console.error("Error playing chunk", e);
    }
  }

  private stopPlayback() {
    if (this.playbackContext) {
      this.playbackContext.close();
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.playbackContext = new AudioContextClass({ sampleRate: 24000 });
      this.nextPlayTime = this.playbackContext.currentTime;
      this.isPlaying = false;
    }
  }

  stop() {
    this.isExplicitlyStopped = true;
    this.isClosingForGoAway = false;
    this.isReconnecting = false;
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    this.resumptionHandle = null;

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.stopPlayback();
    
    if (this.currentSession) {
      try {
        this.currentSession.close();
      } catch {}
      this.currentSession = null;
    }
    if (this.sessionPromise) {
      this.sessionPromise.then(session => {
        try {
          session.close();
        } catch {}
      }).catch(() => {});
      this.sessionPromise = null;
    }
    
    this.onReconnecting(false);
    this.onStateChange("idle");
    this.onClose();
  }

  sendText(text: string) {
    if (this.sessionPromise) {
      this.sessionPromise.then(session => {
        session.sendRealtimeInput({ text });
      });
    }
  }
}
