import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK lazily to prevent crash on startup if key is missing
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is missing. Please add it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// 1. Text-To-Speech (TTS) Endpoint
app.post("/api/tts", async (req, res) => {
  try {
    const { text, voiceName } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text is required for TTS." });
    }

    const ai = getGeminiClient();
    
    // Request audio from gemini-3.1-flash-tts-preview
    // prebuiltVoiceConfig supports: 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: `Say in Hindi: ${text}` }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName || "Kore" },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error("No audio data returned from Gemini TTS model.");
    }

    res.json({ audio: base64Audio });
  } catch (error: any) {
    console.error("TTS generation error:", error);
    res.status(500).json({ 
      error: error.message || "Failed to generate speech", 
      fallback: true,
      message: "API key or TTS model is currently busy. Falling back to native browser Hindi speech synthesis."
    });
  }
});

// 2. Translation (Anvaad) Endpoint
app.post("/api/translate", async (req, res) => {
  try {
    const { text, sourceLang, targetLang } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text is required for translation." });
    }

    const ai = getGeminiClient();

    const systemPrompt = `You are a professional language translator specializing in Indian languages. 
Translate the provided text from ${sourceLang === 'en' ? 'English' : 'Hindi'} to ${targetLang === 'hi' ? 'Hindi (clean Devanagari script)' : 'English'}.
Maintain the same professional, respectful, or colloquial tone.
Provide ONLY the translated text as output. Do not include any explanation, intro, quotes, or formatting.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: text,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.3,
      }
    });

    const translatedText = response.text?.trim() || "";
    res.json({ translatedText });
  } catch (error: any) {
    console.error("Translation error:", error);
    res.status(500).json({ error: error.message || "Translation failed." });
  }
});

// 3. Mayura Chat (Hindi Voice Bot) Endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required." });
    }

    const ai = getGeminiClient();

    // Map roles: 'user' to 'user' and 'model' to 'model'
    const formattedContents = messages.map(msg => ({
      role: msg.role === 'model' ? 'model' as const : 'user' as const,
      parts: [{ text: msg.text }]
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: formattedContents,
      config: {
        systemInstruction: `You are Mayura, an advanced conversational Indic Voice AI built by Sarvam AI. 
Your personality is incredibly warm, highly intelligent, and deeply connected to Indian culture.
You converse fluently in clean Hindi (Devanagari script) or natural everyday Hinglish (mix of Hindi & English) based on what the user prefers.
CRITICAL: Keep your responses extremely short and conversational (maximum 2-3 sentences) so they can be spoken aloud naturally without delay.
Never use lists, bullet points, stars, asterisks, or markdown symbols. Respond in simple conversational sentences. Example: "नमस्ते! मैं मयूरा हूँ। आज मैं आपकी हिंदी आवाज़ या अनुवाद में कैसे सहायता कर सकती हूँ?"`,
        temperature: 0.7,
      }
    });

    const reply = response.text?.trim() || "क्षमा करें, मुझे समझ नहीं आया। क्या आप फिर से बोल सकते हैं?";
    res.json({ reply });
  } catch (error: any) {
    console.error("Chatbot error:", error);
    res.status(500).json({ error: error.message || "Failed to get chat response" });
  }
});

// 4. Shravan STT Post-Processing & Translation
app.post("/api/process-stt", async (req, res) => {
  try {
    const { transcript } = req.body;
    if (!transcript) {
      return res.status(400).json({ error: "Transcript is required" });
    }

    const ai = getGeminiClient();

    const systemPrompt = `You are Shravan, an intelligent Indic transcription assistant.
Analyze the following Hindi speech transcript. Provide:
1. English translation of the transcript.
2. Grammar correction (if any, in Hindi).
3. 3 key topics or keywords mentioned.
Provide response in clean JSON format with keys: "englishTranslation", "correction", "keywords" (array of strings).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Transcript: "${transcript}"`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        temperature: 0.2,
      }
    });

    const resultText = response.text || "{}";
    res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.error("STT process error:", error);
    res.json({ 
      englishTranslation: "Translation failed. Standard offline fallback applies.", 
      correction: "कोई सुधार आवश्यक नहीं है।", 
      keywords: ["Speech", "Hindi", "Audio"] 
    });
  }
});

// Vite Server Configuration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
