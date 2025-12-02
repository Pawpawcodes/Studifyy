import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

import {
  UserProfile,
  UploadedFile,
  Flashcard,
  QuizQuestion,
  StudyPlanDay,
  AgentResponse,
} from "../types";

// ------------------------------------------------------------------
// 🔥 INIT GEMINI FOR TEXT MODELS
// ------------------------------------------------------------------
const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
if (!geminiKey) throw new Error("❌ Missing VITE_GEMINI_API_KEY");

const genAI = new GoogleGenerativeAI(geminiKey);

// Gemini models
const MODEL_FAST = "gemini-1.5-flash-latest";
const MODEL_REASONING = "gemini-1.5-pro-latest";

// ------------------------------------------------------------------
// 🔥 INIT OPENAI FOR REAL TTS AUDIO
// ------------------------------------------------------------------
const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;

let openai: OpenAI | null = null;
if (openaiKey) {
  openai = new OpenAI({ apiKey: openaiKey });
} else {
  console.warn("⚠ OPENAI TTS is disabled (no key provided)");
}

// ------------------------------------------------------------------
// 🔧 PREPARE FILES FOR GEMINI
// ------------------------------------------------------------------
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

// ------------------------------------------------------------------
// 🤖 ORCHESTRATOR (MAIN CHAT BOT)
// ------------------------------------------------------------------
export async function orchestrateRequest(
  query: string,
  userProfile: UserProfile | null,
  files: UploadedFile[],
  history: string
): Promise<AgentResponse> {
  const prompt = `
You are Studify AI, a friendly helpful learning assistant.
Student profile:
${JSON.stringify(userProfile ?? {}, null, 2)}

Conversation History:
${history}

User query:
"${query}"

Give a clear helpful reply.
`;

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_REASONING });

    const result = await model.generateContent([
      ...prepareFiles(files),
      { text: prompt },
    ]);

    return {
      text: result.response.text(),
      sources: [],
    };
  } catch (err: any) {
    console.error("orchestrateRequest ERROR:", err);
    return {
      text: "Error while responding. Try again.",
      sources: [],
    };
  }
}

// ------------------------------------------------------------------
// 📘 EXPLAIN TOPIC
// ------------------------------------------------------------------
export async function explainTopic(
  topic: string,
  user: UserProfile,
  files: UploadedFile[]
): Promise<AgentResponse> {
  const prompt = `
Explain "${topic}" simply.

Student:
${JSON.stringify(user, null, 2)}

Output:
- Simple explanation  
- Step-by-step  
- Example  
- Summary  
`;

  try {
    const result = await genAI
      .getGenerativeModel({ model: MODEL_REASONING })
      .generateContent([...prepareFiles(files), { text: prompt }]);

    return { text: result.response.text(), sources: [] };
  } catch (err: any) {
    return {
      text: "Error explaining topic:\n" + err.message,
      sources: [],
    };
  }
}

// ------------------------------------------------------------------
// ❓ SOLVE DOUBT
// ------------------------------------------------------------------
export async function solveDoubt(
  question: string,
  files: UploadedFile[]
): Promise<AgentResponse> {
  const prompt = `
Solve the student's doubt: "${question}"

Explain:
- What the doubt means  
- Step-by-step solution  
- Common mistakes  
- Summary  
`;

  try {
    const result = await genAI
      .getGenerativeModel({ model: MODEL_REASONING })
      .generateContent([...prepareFiles(files), { text: prompt }]);

    return { text: result.response.text(), sources: [] };
  } catch (err: any) {
    return { text: "Error solving doubt:\n" + err.message, sources: [] };
  }
}

// ------------------------------------------------------------------
// 📝 QUIZ GENERATOR
// ------------------------------------------------------------------
export async function generateQuiz(
  topic: string,
  difficulty: string
): Promise<QuizQuestion[]> {
  const prompt = `
Generate a quiz about "${topic}" (${difficulty}) in JSON only:

[
  {
    "id": "1",
    "question": "...",
    "options": ["A","B","C","D"],
    "correctIndex": 0,
    "explanation": "..."
  }
]
RETURN ONLY JSON.
`;

  try {
    const result = await genAI
      .getGenerativeModel({ model: MODEL_FAST })
      .generateContent(prompt);

    return JSON.parse(result.response.text());
  } catch (err) {
    console.error("Quiz ERROR:", err);
    return [];
  }
}

// ------------------------------------------------------------------
// 📚 FLASHCARDS
// ------------------------------------------------------------------
export async function generateFlashcards(
  topic: string,
  count = 5
): Promise<Flashcard[]> {
  const prompt = `
Generate ${count} flashcards for "${topic}" in JSON:

[
  { "front": "...", "back": "...", "topic": "${topic}" }
]
RETURN ONLY JSON.
`;

  try {
    const result = await genAI
      .getGenerativeModel({ model: MODEL_FAST })
      .generateContent(prompt);

    const cards = JSON.parse(result.response.text());

    return cards.map((c: any, i: number) => ({
      ...c,
      id: `fc-${Date.now()}-${i}`,
      difficulty: 1,
      nextReview: new Date().toISOString(),
    }));
  } catch (err) {
    console.error("Flashcards ERROR:", err);
    return [];
  }
}

// ------------------------------------------------------------------
// 🗓 STUDY PLAN
// ------------------------------------------------------------------
export async function generateStudyPlan(
  user: UserProfile,
  focus: string
): Promise<StudyPlanDay[]> {
  const prompt = `
Create a 7-day study plan.

Student:
${JSON.stringify(user, null, 2)}

Focus: ${focus}

Return JSON:
[
  { "day":"Day 1", "focusTopic":"...", "tasks":["..."] }
]
`;

  try {
    const result = await genAI
      .getGenerativeModel({ model: MODEL_FAST })
      .generateContent(prompt);

    return JSON.parse(result.response.text());
  } catch (err) {
    return [];
  }
}

// ------------------------------------------------------------------
// 🔊 REAL TTS USING OPENAI
// ------------------------------------------------------------------
export async function generateTTS(text: string) {
  if (!openai) {
    console.warn("⚠ TTS disabled — No OpenAI key found.");
    return { text, transcript: text, blob: null, url: null };
  }

  try {
    const response = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: text,
      format: "wav",
    });

    const buffer = await response.arrayBuffer();
    const blob = new Blob([buffer], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);

    return {
      text,
      transcript: text,
      blob,
      url,
      audio_mime: "audio/wav",
    };
  } catch (err: any) {
    console.error("TTS ERROR:", err);
    return { text, transcript: text, blob: null, url: null };
  }
}
