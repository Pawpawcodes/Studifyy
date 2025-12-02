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
// 🔥 INIT GEMINI (TEXT + IMAGES)
// ------------------------------------------------------------------
const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
if (!geminiKey) throw new Error("Missing Gemini API key (VITE_GEMINI_API_KEY)");

const genAI = new GoogleGenerativeAI(geminiKey);

// Gemini models
const MODEL_FAST = "gemini-1.5-flash-latest";
const MODEL_REASONING = "gemini-1.5-pro-latest";

// ------------------------------------------------------------------
// 🔥 INIT OPENAI (REAL TTS AUDIO)
// ------------------------------------------------------------------
const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
if (!openaiKey) {
  console.warn("⚠ No OpenAI key found. TTS will not work.");
}

const openai = openaiKey
  ? new OpenAI({ apiKey: openaiKey })
  : null;

// ------------------------------------------------------------------
// 🔧 Prepare file uploads for Gemini
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
// 📘 EXPLAIN TOPIC
// ------------------------------------------------------------------
export async function explainTopic(
  topic: string,
  user: UserProfile,
  files: UploadedFile[]
): Promise<AgentResponse> {
  const prompt = `
Explain the topic "${topic}" for a student.

Student:
${JSON.stringify(user, null, 2)}

Provide:
• Easy explanation  
• Step-by-step breakdown  
• Mini example  
• Summary bullets  
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
    console.error("ExplainTopic ERROR:", err);
    return {
      text:
        "Error explaining topic:\n\n" +
        (err.message || JSON.stringify(err)),
      sources: [],
    };
  }
}

// ------------------------------------------------------------------
// ❓ DOUBT SOLVER
// ------------------------------------------------------------------
export async function solveDoubt(
  question: string,
  files: UploadedFile[]
): Promise<AgentResponse> {
  const prompt = `
Solve this doubt: "${question}"

Return:
1. What the doubt means  
2. Step-by-step answer  
3. Common mistakes  
4. Final summary  
`;

  try {
    const result = await genAI
      .getGenerativeModel({ model: MODEL_REASONING })
      .generateContent([...prepareFiles(files), { text: prompt }]);

    return {
      text: result.response.text(),
      sources: [],
    };
  } catch (err: any) {
    console.error("solveDoubt ERROR:", err);
    return {
      text:
        "Error solving doubt:\n\n" +
        (err.message || JSON.stringify(err)),
      sources: [],
    };
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
Create a JSON quiz about "${topic}" (${difficulty} difficulty).

Format:
[
  {
    "id": "1",
    "question": "...",
    "options": ["A", "B", "C", "D"],
    "correctIndex": 0,
    "explanation": "..."
  }
]
RETURN ONLY THE JSON.
`;

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_FAST });
    const result = await model.generateContent(prompt);

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
Generate ${count} flashcards for "${topic}" as JSON:

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
// 🗓️ STUDY PLAN
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
  { "day": "Day 1", "focusTopic": "...", "tasks": ["..."] }
]
ONLY JSON.
`;

  try {
    const result = await genAI
      .getGenerativeModel({ model: MODEL_FAST })
      .generateContent(prompt);

    return JSON.parse(result.response.text());
  } catch (err) {
    console.error("StudyPlan ERROR:", err);
    return [];
  }
}

// ------------------------------------------------------------------
// 🔊 REAL TTS (OpenAI)
// ------------------------------------------------------------------
export async function generateTTS(text: string) {
  if (!openai) {
    console.warn("⚠ No OpenAI API key. TTS disabled.");
    return {
      text,
      transcript: text,
      audio_mime: "audio/wav",
      blob: null,
      url: null,
    };
  }

  try {
    console.log("🔊 Generating TTS via OpenAI…");

    const response = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: text,
      format: "wav"
    });

    const arrayBuffer = await response.arrayBuffer();
    const wavBlob = new Blob([arrayBuffer], { type: "audio/wav" });
    const url = URL.createObjectURL(wavBlob);

    return {
      text,
      transcript: text,
      audio_mime: "audio/wav",
      blob: wavBlob,
      url
    };

  } catch (err: any) {
    console.error("TTS ERROR:", err);
    return {
      text,
      transcript: text,
      audio_mime: "error",
      blob: null,
      url: null,
    };
  }
}
// ------------------------------------------------------------------
// 🤖 ORCHESTRATOR (Chat Assistant)
// Combines: history + user + files → Gemini response
// ------------------------------------------------------------------
export async function orchestrateRequest(
  query: string,
  userProfile: UserProfile | null,
  files: UploadedFile[],
  history: string
): Promise<AgentResponse> {
  
  const prompt = `
You are Studify AI, a friendly, helpful learning assistant.
Student profile:
${JSON.stringify(userProfile ?? {}, null, 2)}

Conversation so far:
${history}

User says: "${query}"

Reply clearly and helpful.
`;

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_REASONING });

    const result = await model.generateContent([
      ...prepareFiles(files),
      { text: prompt }
    ]);

    return {
      text: result.response.text(),
      sources: []
    };
  } catch (err: any) {
    console.error("orchestrateRequest ERROR:", err);
    return {
      text: "Error answering your question. Try again.",
      sources: []
    };
  }
}
