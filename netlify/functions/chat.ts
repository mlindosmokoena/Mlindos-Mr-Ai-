import type { Handler } from '@netlify/functions';
import { GoogleGenAI } from '@google/genai';

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

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'GEMINI_API_KEY environment variable is not configured in Netlify settings.',
        }),
      };
    }

    const body = event.body ? JSON.parse(event.body) : {};
    const { message, history = [], language = 'auto', voiceTone = 'futuristic' } = body;

    if (!message || typeof message !== 'string') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Message string is required' }),
      };
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Build chat contents from history
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
    const recentHistory = Array.isArray(history) ? history.slice(-8) : [];
    for (const item of recentHistory) {
      if (item && item.content && item.role) {
        contents.push({
          role: item.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: item.content }],
        });
      }
    }

    const contextPrompt =
      language && language !== 'auto'
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
        lastError = err;
      }
    }

    if (!responseText && lastError) {
      throw lastError;
    }

    const rawText = responseText || "I'm ready for your next question!";

    // Parse suggestions
    let mainText = rawText;
    let suggestions: string[] = [];

    const suggestionsSplit = rawText.split(/SUGGESTIONS:/i);
    if (suggestionsSplit.length > 1) {
      mainText = suggestionsSplit[0].trim();
      const rawSuggestions = suggestionsSplit[1];
      suggestions = rawSuggestions
        .split('\n')
        .map((s) => s.replace(/^[-*•0-9.)\s]+/, '').trim())
        .filter((s) => s.length > 0 && s.length < 60)
        .slice(0, 3);
    }

    if (suggestions.length === 0) {
      suggestions = [
        'Tell me a fun fact',
        'What is your favorite topic?',
        'Translate "Hello" into 3 languages',
      ];
    }

    const spokenText = stripMarkdownForSpeech(mainText);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        text: mainText,
        spokenText,
        suggestions,
        timestamp: Date.now(),
      }),
    };
  } catch (err: unknown) {
    console.error('Netlify function chat error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal AI server error';
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to generate voice assistant response',
        details: errorMessage,
      }),
    };
  }
};
