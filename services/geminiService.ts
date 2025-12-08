import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  UserProfile,
  UploadedFile,
  Flashcard,
  QuizQuestion,
  StudyPlanDay,
  AgentResponse,
} from "../types";

// INIT
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

// CORRECT MODELS FOR v1beta
const MODEL_REASONING = "gemini-pro";       
const MODEL_FAST = "gemini-pro";            
const MODEL_TTS = "gemini-pro-tts";         

// FILE PREP
function prepareFiles(files: UploadedFile[]) {
  return (files || [])
    .filter((f) => f.data && f.mimeType)
    .map((f) => ({
      inlineData: {
        data: f.data!,
        mimeType: f.mimeType!,
      },
    }));
}

// MAIN CHAT
export async function orchestrateRequest(query: string, user: UserProfile|null, files: UploadedFile[], history: string) {
  const prompt = `
You are Studify AI.
Explain clearly and simply.

User: ${JSON.stringify(user)}
History: ${history}
Question: ${query}
`;

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_REASONING });
    const result = await model.generateContent([
      ...prepareFiles(files),
      { text: prompt },
    ]);
    return { text: result.response.text(), sources: [] };
  } catch (e:any) {
    return { text: "Error: " + e.message, sources: [] };
  }
}

// EXPLAIN TOPIC
export async function explainTopic(topic: string, user: UserProfile, files: UploadedFile[]) {
  const prompt = `Explain ${topic} simply, step-by-step.`;

  try {
    const result = await genAI
      .getGenerativeModel({ model: MODEL_REASONING })
      .generateContent([{ text: prompt }]);
    return { text: result.response.text(), sources: [] };
  } catch (e:any) {
    return { text: "Error: " + e.message, sources: [] };
  }
}

// TTS (REAL GEMINI TTS)
export async function generateTTS(text: string) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_TTS}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          generationConfig: { responseModalities: ["AUDIO"] },
        }),
      }
    );

    const json = await response.json();
    const base64 = json?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64) throw new Error("No audio returned");

    const byteString = atob(base64);
    const bytes = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) bytes[i] = byteString.charCodeAt(i);

    const blob = new Blob([bytes], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);

    return { text, url, blob };
  } catch (e) {
    console.error("TTS ERROR:", e);
    return { text, url: null, blob: null };
  }
}
