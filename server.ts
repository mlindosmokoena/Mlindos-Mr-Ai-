import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize GoogleGenAI server-side with User-Agent header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const SYSTEM_INSTRUCTION = `You are "Mlindos Mr Ai voice 🌍", a cutting-edge worldwide AI voice assistant inspired by Siri and next-generation Android assistants.
Your name is strictly "Mlindos Mr Ai voice 🌍" (or simply "Mlindos Mr Ai voice").
Key persona guidelines:
1. Warm, intelligent, charismatic, futuristic, and helpful.
2. Tone: Friendly, conversational, crisp, and direct. You are an audio-first assistant designed for mobile browsers, hands-free voice interaction, and quick screen consumption.
3. Spoken delivery: Your responses are voiced aloud using Text-To-Speech. Keep phrasing smooth, punchy, and natural to listen to. Avoid clutter like excessive asterisks, citations, or unpronounceable formatting.
4. Multilingual: You are worldwide. If the user speaks or asks in English, isiZulu, isiXhosa, Kiswahili, Spanish, French, Portuguese, German, Arabic, Hindi, or any world language, answer fluently in that language!
5. Greeting: If greeted, give a friendly greeting as Mlindos Mr Ai voice.
6. Capabilities: You answer questions, explain concepts, provide life hacks, translate languages, draft messages, solve problems, tell jokes, give motivational pep-talks, and guide users smoothly.`;

function stripMarkdownForSpeech(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/`{1,3}(.*?)`{1,3}/g, '$1')
    .replace(/#+\s*/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/[-*•]\s+/g, '')
    .replace(/🌍/g, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .trim();
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    assistant: 'Mlindos Mr Ai voice 🌍',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Main chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history = [], language = 'auto', voiceTone = 'futuristic' } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured on the server.',
      });
    }

    // Build contents from history plus current message
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    // Include recent history (last 8 turns for responsive voice context)
    const recentHistory = Array.isArray(history) ? history.slice(-8) : [];
    for (const item of recentHistory) {
      if (item && item.content && item.role) {
        contents.push({
          role: item.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: item.content }],
        });
      }
    }

    // Append user's current message with language context if specified
    const contextPrompt = language && language !== 'auto'
      ? `[User preferred language/locale: ${language}] ${message}`
      : message;

    contents.push({
      role: 'user',
      parts: [{ text: contextPrompt }],
    });

    const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
    let responseText = '';
    let lastError: unknown = null;

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction: `${SYSTEM_INSTRUCTION}\nStyle preference: ${voiceTone}. Always suggest 3 concise follow-up query suggestions at the very end formatted strictly as:\nSUGGESTIONS:\n- <suggestion 1>\n- <suggestion 2>\n- <suggestion 3>`,
          },
        });
        if (response.text) {
          responseText = response.text;
          break;
        }
      } catch (err) {
        console.warn(`Model ${modelName} returned error, trying fallback...`, err);
        lastError = err;
      }
    }

    if (!responseText && lastError) {
      throw lastError;
    }

    const rawText = responseText || "I'm here to help you. What would you like to explore next?";

    // Parse suggestions if present
    let mainText = rawText;
    let suggestions: string[] = [];

    const suggestionsSplit = rawText.split(/SUGGESTIONS:/i);
    if (suggestionsSplit.length > 1) {
      mainText = suggestionsSplit[0].trim();
      const rawSuggestions = suggestionsSplit[1];
      suggestions = rawSuggestions
        .split('\n')
        .map(s => s.replace(/^[-*•0-9.)\s]+/, '').trim())
        .filter(s => s.length > 0 && s.length < 60)
        .slice(0, 3);
    }

    if (suggestions.length === 0) {
      suggestions = [
        "Tell me a fun fact",
        "What's your favorite thing to do?",
        "Translate 'Hello world' into 3 languages",
      ];
    }

    const spokenText = stripMarkdownForSpeech(mainText);

    return res.json({
      text: mainText,
      spokenText,
      suggestions,
      timestamp: Date.now(),
    });
  } catch (err: unknown) {
    console.error('Error generating AI response:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown AI server error';
    return res.status(500).json({
      error: 'Failed to generate voice assistant response',
      details: errorMessage,
    });
  }
});

// Vite middleware in dev, static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Mlindos Mr Ai voice 🌍] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
