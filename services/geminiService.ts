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

// =====================================================
//  INIT GEMINI
// =====================================================
const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
if (!geminiKey) console.error("❌ Missing VITE_GEMINI_API_KEY");

const genAI = new GoogleGenerativeAI(geminiKey);

// Correct models
const MODEL_FAST = "gemini-1.5-flash";
const MODEL_REASONING = "gemini-1.5-pro";

// =====================================================
//  INIT OPENAI FOR TTS  (Frontend Safe)
// =====================================================
const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;

let openai: OpenAI | null = null;
if (openaiKey) {
  openai = new OpenAI({
    apiKey: openaiKey,
    dangerouslyAllowBrowser: true, // REQUIRED for frontend TTS
  });
} else {
  console.warn("⚠ No OPENAI key — TTS disabled.");
}

// =====================================================
//  FILE HELPER
// =====================================================
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

// =====================================================
//  ORCHESTRATOR
// =====================================================
export async function orchestrateRequest(
  query: string,
  userProfile: UserProfile | null,
  files: UploadedFile[],
  history: string
): Promise<AgentResponse> {
  const prompt = `
You are Studify AI.
Be clear, helpful, and tutor-like.

User profile:
${JSON.stringify(userProfile ?? {}, null, 2)}

History:
${history}

User query: "${query}"
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
    return { text: "Error while responding.", sources: [] };
  }
}

// =====================================================
//  EXPLAIN TOPIC
// =====================================================
export async function explainTopic(
  topic: string,
  user: UserProfile,
  files: UploadedFile[]
): Promise<AgentResponse> {
  const prompt = `
Explain the topic "${topic}" clearly.

Student:
${JSON.stringify(user, null, 2)}

Required:
- Simple overview
- Step-by-step explanation
- Small example
- Key points summary
  `;

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_REASONING });

    const result = await model.generateContent([
      ...prepareFiles(files),
      { text: prompt },
    ]);

    return { text: result.response.text(), sources: [] };
  } catch (err: any) {
    return { text: "Error explaining topic:\n" + err.message, sources: [] };
  }
}

// =====================================================
//  DOUBTS
// =====================================================
export async function solveDoubt(question: string, files: UploadedFile[]) {
  const prompt = `
Solve the student's doubt: "${question}"

Explain:
- Doubt meaning
- Step-by-step reasoning
- Final answer
- Common mistakes
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
    return { text: "Error solving doubt.", sources: [] };
  }
}

// =====================================================
//  QUIZ
// =====================================================
export async function generateQuiz(topic: string, difficulty: string) {
  const prompt = `
Create a ${difficulty} quiz for topic "${topic}".
JSON output only:

[
  {
    "id": "1",
    "question": "....",
    "options": ["A", "B", "C", "D"],
    "correctIndex": 0,
    "explanation": "..."
  }
]
  `;

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_FAST });

    const result = await model.generateContent(prompt);

    return JSON.parse(result.response.text());
  } catch {
    return [];
  }
}

// =====================================================
//  FLASHCARDS
// =====================================================
export async function generateFlashcards(topic: string, count = 5) {
  const prompt = `
Generate ${count} flashcards for "${topic}".
JSON only.
  `;

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_FAST });

    const result = await model.generateContent(prompt);

    const cards = JSON.parse(result.response.text());

    return cards.map((c: any, i: number) => ({
      ...c,
      id: `fc-${Date.now()}-${i}`,
      nextReview: new Date().toISOString(),
      difficulty: 1,
    }));
  } catch {
    return [];
  }
}

// =====================================================
//  STUDY PLAN
// =====================================================
export async function generateStudyPlan(user: UserProfile, focus: string) {
  const prompt = `
Generate a 7-day study plan.

Student:
${JSON.stringify(user, null, 2)}

Focus: ${focus}

Return JSON only.
  `;

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_FAST });

    const result = await model.generateContent(prompt);

    return JSON.parse(result.response.text());
  } catch {
    return [];
  }
}

// =====================================================
//  TTS (WORKING) — OpenAI AUDIO OUTPUT
// =====================================================
export async function generateTTS(text: string) {
  if (!openai) {
    console.warn("⚠ TTS disabled — missing OpenAI key");
    return { text, transcript: text, url: null, blob: null };
  }

  try {
    const audio = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: text,
      format: "wav",
    });

    const buffer = await audio.arrayBuffer();
    const blob = new Blob([buffer], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);

    return { text, transcript: text, blob, url };
  } catch (err) {
    console.error("TTS ERROR:", err);
    return { text, transcript: text, url: null, blob: null };
  }
}
