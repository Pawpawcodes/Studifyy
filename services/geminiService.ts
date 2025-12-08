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

// ✅ Correct models for v1beta
const MODEL_FAST = "gemini-1.5-flash-8b";
const MODEL_REASONING = "gemini-1.0-pro";

// ---------------------------------------------------------
// FILE HANDLING
// ---------------------------------------------------------
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
You are Studify AI.
You're a friendly teacher.

Student: ${JSON.stringify(user)}

History:
${history}

Question: "${query}"
`;

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_REASONING });
    const result = await model.generateContent([
      ...prepareFiles(files),
      { text: prompt }
    ]);

    return { text: result.response.text(), sources: [] };
  } catch (err: any) {
    return { text: "Error: " + err.message, sources: [] };
  }
}

// ---------------------------------------------------------
// EXPLAIN TOPIC
// ---------------------------------------------------------
export async function explainTopic(topic: string, user: UserProfile, files: UploadedFile[]) {
  const prompt = `
Explain "${topic}" simply:

Student:
${JSON.stringify(user, null, 2)}

Include:
- Overview
- Step-by-step explanation
- Example
- Summary
`;

  try {
    const result = await genAI
      .getGenerativeModel({ model: MODEL_REASONING })
      .generateContent([...prepareFiles(files), { text: prompt }]);

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
Solve the doubt: "${question}"

Explain:
- What the doubt means
- Steps
- Common mistakes
- Final summary
`;

  try {
    const result = await genAI
      .getGenerativeModel({ model: MODEL_REASONING })
      .generateContent([...prepareFiles(files), { text: prompt }]);

    return { text: result.response.text(), sources: [] };
  } catch (err: any) {
    return { text: "Error: " + err.message, sources: [] };
  }
}

// ---------------------------------------------------------
// QUIZ
// ---------------------------------------------------------
export async function generateQuiz(topic: string, difficulty: string) {
  const prompt = `
Generate a ${difficulty} quiz for "${topic}".
Return ONLY JSON.
`;

  try {
    const result = await genAI
      .getGenerativeModel({ model: MODEL_FAST })
      .generateContent(prompt);

    return JSON.parse(result.response.text());
  } catch {
    return [];
  }
}

// ---------------------------------------------------------
// FLASHCARDS
// ---------------------------------------------------------
export async function generateFlashcards(topic: string, count = 5) {
  const prompt = `
Generate ${count} flashcards for "${topic}".
Return JSON only.
`;

  try {
    const result = await genAI
      .getGenerativeModel({ model: MODEL_FAST })
      .generateContent(prompt);

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

// ---------------------------------------------------------
// STUDY PLAN
// ---------------------------------------------------------
export async function generateStudyPlan(user: UserProfile, focus: string) {
  const prompt = `
Create 7-day study plan for this student:
${JSON.stringify(user)}

Focus: ${focus}

Return JSON only.
`;

  try {
    const result = await genAI
      .getGenerativeModel({ model: MODEL_FAST })
      .generateContent(prompt);

    return JSON.parse(result.response.text());
  } catch {
    return [];
  }
}

// ---------------------------------------------------------
// TTS (Google Audio Generation)
// ---------------------------------------------------------
export async function generateTTS(text: string) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          generationConfig: { responseModalities: ["AUDIO"] },
        }),
      }
    );

    const result = await response.json();

    const base64 = result?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64) throw new Error("No audio returned");

    const blob = new Blob([Uint8Array.from(atob(base64), c => c.charCodeAt(0))], {
      type: "audio/wav"
    });

    return {
      url: URL.createObjectURL(blob),
      blob,
      text,
      audio_mime: "audio/wav",
    };

  } catch (err) {
    console.error("TTS ERROR:", err);
    return { url: null };
  }
}
