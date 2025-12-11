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

// Guard Gemini client initialization to avoid runtime failures when key is missing
let genAI: GoogleGenerativeAI | null = null;
try {
  if (apiKey) {
    genAI = new GoogleGenerativeAI(apiKey);
  }
} catch (e) {
  console.error("Failed to initialize GoogleGenerativeAI:", e);
  genAI = null;
}

// Derive Functions URL
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
let FUNCTIONS_TTS_URL =
  "https://wkefepwnztesbjdyqybp.functions.supabase.co/generate-tts";

if (supabaseUrl) {
  const match = supabaseUrl.match(/^https:\/\/([^.]+)\.supabase\.co/i);
  const ref = match?.[1];
  if (ref) {
    FUNCTIONS_TTS_URL = `https://${ref}.functions.supabase.co/generate-tts`;
  } else {
    FUNCTIONS_TTS_URL =
      supabaseUrl.replace(".supabase.co", ".functions.supabase.co") +
      "/generate-tts";
  }
}

// GEMINI MODELS
const MODEL_FAST = "gemini-2.5-flash";
const MODEL_REASONING = "gemini-2.5-flash";

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
  history: string,
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
// EXPLAIN TOPIC  (🔥 REQUIRED FOR NETLIFY BUILD SUCCESS)
// ---------------------------------------------------------
export async function explainTopic(
  topic: string,
  user: UserProfile,
  files: UploadedFile[],
) {
  const prompt = `
Explain "${topic}" very simply.

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
    if (!genAI) {
      // Fallback: generate a simple local quiz when API key is not configured
      const sample: QuizQuestion[] = Array.from({ length: 5 }).map((_, i) => ({
        id: `q-${Date.now()}-${i}`,
        question: `(${difficulty}) ${topic}: Sample question ${i + 1}?`,
        options: ["Option A", "Option B", "Option C", "Option D"],
        correctIndex: i % 4,
        explanation: `Explanation for ${topic} question ${i + 1}.`,
      }));
      return sample;
    }

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
    if (!genAI) {
      // Fallback: generate simple local flashcards
      const now = new Date().toISOString();
      const cards: Flashcard[] = Array.from({ length: count }).map((_, i) => ({
        id: `fc-${Date.now()}-${i}`,
        front: `${topic}: Question ${i + 1}`,
        back: `${topic}: Answer ${i + 1}`,
        topic,
        nextReview: now,
        difficulty: 0,
      }));
      return cards;
    }

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
    return [];
  }
}

// ---------------------------------------------------------
// STUDY PLAN
// ---------------------------------------------------------
export async function generateStudyPlan(user: UserProfile, focus: string) {
  const prompt = `
Create a 7-day study plan for this user:
${JSON.stringify(user)}

Focus: ${focus}

Return ONLY JSON.
`;

  try {
    if (!genAI) {
      // Fallback: generate a simple local 7-day plan
      const days = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ];
      const plan: StudyPlanDay[] = days.map((day, i) => ({
        day,
        focusTopic: focus,
        tasks: [
          `Study ${focus} for ${user.studyHoursPerDay || 1} hour(s)`,
          `Practice 5 questions on ${focus}`,
          "Review notes",
        ],
      }));
      return plan;
    }

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
// FIXED TTS (Supabase Edge Function → Base64 MP3)
// ---------------------------------------------------------
export async function generateTTS(text: string) {
  try {
    const trimmed = text?.trim();
    if (!trimmed) return { text: "", transcript: "", url: null, blob: null };

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

    const data = await response.json();
    const base64 = data.audio;
    const mime = data.mimeType || "audio/mpeg";

    if (!base64) throw new Error("Missing 'audio' in TTS response");

    // Base64 → Blob
    const audioBinary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const blob = new Blob([audioBinary], { type: mime });

    const url = URL.createObjectURL(blob);

    return {
      text: trimmed,
      transcript: trimmed,
      url,
      blob,
      audio_mime: mime,
      audio_base64: base64,
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
