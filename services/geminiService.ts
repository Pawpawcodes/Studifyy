import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  UserProfile,
  UploadedFile,
  Flashcard,
  QuizQuestion,
  StudyPlanDay,
  AgentResponse,
} from "../types";

// --------------------------------------------------
// INIT GEMINI (ONLY FLASH MODEL WORKS FOR v1beta KEYS)
// --------------------------------------------------
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) console.error("❌ Missing VITE_GEMINI_API_KEY");

const genAI = new GoogleGenerativeAI(apiKey);

// ONLY WORKING MODELS FOR YOUR KEY
const MODEL = "gemini-1.5-flash";

// --------------------------------------------------
// FILE HANDLING
// --------------------------------------------------
function prepareFiles(files: UploadedFile[]) {
  return (files || [])
    .filter((f) => f.mimeType && f.data)
    .map((f) => ({
      inlineData: {
        data: f.data!,
        mimeType: f.mimeType!,
      },
    }));
}

// --------------------------------------------------
// ORCHESTRATOR (MAIN CHAT)
// --------------------------------------------------
export async function orchestrateRequest(
  query: string,
  user: UserProfile | null,
  files: UploadedFile[],
  history: string
): Promise<AgentResponse> {
  const prompt = `
You are Studify AI.
Be simple, clear, friendly.
Student:
${JSON.stringify(user)}
History:
${history}
Query: "${query}"
`;

  try {
    const model = genAI.getGenerativeModel({ model: MODEL });
    const result = await model.generateContent([
      ...prepareFiles(files),
      { text: prompt },
    ]);

    return { text: result.response.text(), sources: [] };
  } catch (err: any) {
    console.error("orchestrate ERROR:", err);
    return { text: "Error: " + err.message, sources: [] };
  }
}

// --------------------------------------------------
// EXPLAIN TOPIC
// --------------------------------------------------
export async function explainTopic(topic: string, user: UserProfile, files: UploadedFile[]) {
  const prompt = `
Explain "${topic}" simply.
Student: ${JSON.stringify(user)}
Include:
- Overview
- Steps
- Example
- Summary
`;

  try {
    const model = genAI.getGenerativeModel({ model: MODEL });
    const result = await model.generateContent([
      ...prepareFiles(files),
      { text: prompt },
    ]);

    return { text: result.response.text(), sources: [] };
  } catch (err: any) {
    return { text: "Error: " + err.message, sources: [] };
  }
}

// --------------------------------------------------
// SOLVE DOUBT
// --------------------------------------------------
export async function solveDoubt(question: string, files: UploadedFile[]) {
  const prompt = `
Solve the doubt: "${question}"
Explain:
- What it means
- Step-by-step answer
- Common mistakes
- Summary
`;

  try {
    const model = genAI.getGenerativeModel({ model: MODEL });
    const result = await model.generateContent([
      ...prepareFiles(files),
      { text: prompt },
    ]);

    return { text: result.response.text(), sources: [] };
  } catch (err: any) {
    return { text: "Error: " + err.message, sources: [] };
  }
}

// --------------------------------------------------
// QUIZ GENERATOR
// --------------------------------------------------
export async function generateQuiz(topic: string, difficulty: string) {
  const prompt = `
Generate a ${difficulty} quiz for "${topic}".
Return ONLY JSON.
`;

  try {
    const model = genAI.getGenerativeModel({ model: MODEL });
    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text());
  } catch {
    return [];
  }
}

// --------------------------------------------------
// FLASHCARDS
// --------------------------------------------------
export async function generateFlashcards(topic: string, count = 5) {
  const prompt = `
Generate ${count} flashcards for "${topic}".
Return ONLY JSON.
`;

  try {
    const model = genAI.getGenerativeModel({ model: MODEL });
    const result = await model.generateContent(prompt);

    const cards = JSON.parse(result.response.text());

    return cards.map((c: any, i: number) => ({
      ...c,
      id: `fc-${Date.now()}-${i}`,
      nextReview: new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

// --------------------------------------------------
// STUDY PLAN
// --------------------------------------------------
export async function generateStudyPlan(user: UserProfile, focus: string) {
  const prompt = `
Create a 7-day study plan.
Student: ${JSON.stringify(user)}
Focus: ${focus}
Return ONLY JSON.
`;

  try {
    const model = genAI.getGenerativeModel({ model: MODEL });
    const result = await model.generateContent(prompt);

    return JSON.parse(result.response.text());
  } catch {
    return [];
  }
}

// --------------------------------------------------
// TTS — NOT SUPPORTED WITH YOUR API KEY
// --------------------------------------------------
export async function generateTTS(text: string) {
  return {
    text,
    transcript: text,
    blob: null,
    url: null,
    audio_mime: "audio/wav",
  };
}
