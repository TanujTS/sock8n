import { GoogleGenAI } from '@google/genai';
import { ENV } from '../config/env';

export const ai = new GoogleGenAI({ apiKey: ENV.GEMINI_API_KEY });
export const MODEL_NAME = 'gemini-2.5-flash';
