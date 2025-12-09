import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  UserProfile,
  UploadedFile,
  Flashcard,
  QuizQuestion,
  StudyPlanDay,
  AgentResponse,
} from "../types";

// ---------------------------------------------------------
// INIT GEMINI
// ---------------------------------------------------------
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
if (!apiKey) console.error("❌ Missing VITE_GEMINI_API_KEY");

const genAI = new GoogleGenerativeAI(apiKey);

// Derive the new Edge Functions host (project-ref.functions.supabase.co)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
let FUNCTIONS_TTS_URL = "https://wkefepwnztesbjdyqybp.functions.supabase.co/generate-tts";
if (supabaseUrl) {
  const match = supabaseUrl.match(/^https:\/\/([^.]+)\.supabase\.co/i);
  const ref = match?.[1];
  if (ref) {
    FUNCTIONS_TTS_URL = `https://${ref}.functions.supabase.co/generate-tts`;
  } else {
    // Fallback: swap the domain if the URL looks standard
    FUNCTIONS_TTS_URL = supabaseUrl.replace(".supabase.co", ".functions.supabase.co") + "/generate-tts";
  }
}

// Current stable model names for this app
// NOTE: 1.5 models are deprecated on the v1beta API, which is why
// you were seeing 404s in production. We now use 2.5 models.
// - gemini-2.5-flash: fast, strong general model
// - gemini-2.5-flash again for "reasoning" tasks in this app
const MODEL_FAST = "gemini-2.5-flash";
const MODEL_REASONING = "gemini-2.5-flash";
// TTS is served via a Supabase Edge Function that calls
// the dedicated TTS model `gemini-2.5-flash-preview-tts`.
// This constant is kept for documentation only.
const MODEL_TTS = "gemini-2.5-flash-preview-tts";

// ---------------------------------------------------------
// FILE HANDLING
// ---------------------------------------------------------
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

// ---------------------------------------------------------
// MAIN CHAT ORCHESTRATOR
// ---------------------------------------------------------
export async function orchestrateRequest(
  query: string,
  user: UserProfile | null,
  files: UploadedFile[],
  history: string
): Promise<AgentResponse> {
  const prompt = `
You are Studify AI, a helpful tutor.

User:
${JSON.stringify(user)}

History:
${history}

Question: ${query}
`;

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_REASONING });
    const result = await model.generateContent([
      ...prepareFiles(files),
      { text: prompt },
    ]);

    return { text: result.response.text(), sources: [] };
  } catch (err: any) {
    console.error("orchestrateRequest ERROR:", err);
    return { text: "Error: " + err.message, sources: [] };
  }
}

// ---------------------------------------------------------
// EXPLAIN TOPIC
// ---------------------------------------------------------
export async function explainTopic(topic: string, user: UserProfile, files: UploadedFile[]) {
  const prompt = `
Explain "${topic}" simply.

Include:
- Overview
- Steps
- Example
- Summary
`;

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_REASONING });
    const result = await model.generateContent([
      ...prepareFiles(files),
      { text: prompt },
    ]);

    return { text: result.response.text(), sources: [] };
  } catch (err: any) {
    return { text: "Error: " + err.message, sources: [] };
  }
}

// ---------------------------------------------------------
// SOLVE DOUBT
// ---------------------------------------------------------
export async function solveDoubt(question: string, files: UploadedFile[]) {
  const prompt = `
Solve this doubt: "${question}"

Explain:
- What it means
- Step-by-step solution
- Mistakes to avoid
- Summary
`;

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_REASONING });
    const result = await model.generateContent([
      ...prepareFiles(files),
      { text: prompt },
    ]);

    return { text: result.response.text(), sources: [] };
  } catch (err: any) {
    return { text: "Error: " + err.message, sources: [] };
  }
}

// ---------------------------------------------------------
// QUIZ GENERATOR
// ---------------------------------------------------------
export async function generateQuiz(topic: string, difficulty: string) {
  const prompt = `
Create a ${difficulty} quiz on "${topic}".
Return ONLY JSON.
`;

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_FAST });
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    });
    return JSON.parse(result.response.text());
  } catch (err) {
    console.error("QUIZ ERROR:", err);
    return [];
  }
}

// ---------------------------------------------------------
// FLASHCARDS
// ---------------------------------------------------------
export async function generateFlashcards(topic: string, count = 5) {
  const prompt = `
Generate ${count} flashcards on "${topic}".
Return ONLY JSON.
`;

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_FAST });
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    });

    const cards = JSON.parse(result.response.text());
    return cards.map((c: any, i: number) => ({
      ...c,
      id: `fc-${Date.now()}-${i}`,
      nextReview: new Date().toISOString(),
    }));
  } catch (err) {
    console.error("FLASHCARD ERROR:", err);
    return [];
  }
}

// ---------------------------------------------------------
// STUDY PLAN
// ---------------------------------------------------------
export async function generateStudyPlan(user: UserProfile, focus: string) {
  const prompt = `
Create a 7-day study plan for:

${JSON.stringify(user)}

Focus: ${focus}

Return ONLY JSON.
`;

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_FAST });
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    });
    return JSON.parse(result.response.text());
  } catch (err) {
    return [];
  }
}

// ---------------------------------------------------------
// TTS (Supabase Edge Function wrapper)
// ---------------------------------------------------------
// We call the modern Functions endpoint directly:
//   https://<project-ref>.functions.supabase.co/generate-tts
// with JSON { text: "..." } and the anon key in the Authorization header.
export async function generateTTS(text: string) {
  try {
    const trimmed = text?.trim();
    if (!trimmed) {
      return { text: "", transcript: "", url: null, blob: null };
    }

    const response = await fetch(FUNCTIONS_TTS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ text: trimmed }),
    });

    if (!response.ok) {
      const msg = await response.text().catch(() => "");
      throw new Error(`generate-tts HTTP ${response.status}: ${msg}`);
    }

    const data: any = await response.json();
    const url: string | undefined = data?.url;
    if (!url) throw new Error("No audio URL returned from generate-tts function");

    return {
      text: trimmed,
      transcript: trimmed,
      url,
      blob: null,
      audio_mime: data?.mimeType || "audio/mpeg",
      audio_base64: null,
    };
  } catch (err) {
    console.error("TTS ERROR:", err);
    return {
      text,
      transcript: text,
      url: null,
      blob: null,
      audio_mime: undefined,
      audio_base64: null,
    };
  }
}
