import { GoogleGenAI } from '@google/genai';

/**
 * Server-side Gemini AI Client with Google Search Grounding capabilities.
 * Always accesses process.env.GEMINI_API_KEY server-side only.
 */
let cachedGenAI: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (cachedGenAI) {
    return cachedGenAI;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not configured.');
  }

  cachedGenAI = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  return cachedGenAI;
}

