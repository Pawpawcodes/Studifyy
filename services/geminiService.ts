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

// Correct models
const MODEL_FAST = "gemini-1.5-flash";
const MODEL_REASONING = "gemini-1.5-pro";

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
Be friendly, clear, and helpful.

User:
${JSON.stringify(user)}

History:
${history}

Query: "${query}"
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
// EXPLAIN TOPIC
// ---------------------------------------------------------
export async function explainTopic(topic: string, user: UserProfile, files: UploadedFile[]) {
  const prompt = `
Explain the topic "${topic}" simply.

Student:
${JSON.stringify(user, null, 2)}

Include:
- Overview
- Step-by-step explanation
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
Solve the doubt: "${question}"

Explain:
- What the doubt means
- Step-by-step solution
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
    return { text: "Error: " + err.message, sources: [] };
  }
}

// ---------------------------------------------------------
// QUIZ GENERATOR
// ---------------------------------------------------------
export async function generateQuiz(topic: string, difficulty: string) {
  const prompt = `
Generate a ${difficulty} quiz for "${topic}".
Return ONLY JSON.
  `;

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_FAST });
    const result = await model.generateContent(prompt);
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
Generate ${count} flashcards for ${topic}.
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
Generate a 7-day study plan.

Student:
${JSON.stringify(user)}

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

// ---------------------------------------------------------
// REAL GEMINI TTS (WORKS IN BROWSER, NO OPENAI)
// ---------------------------------------------------------
export async function generateTTS(text: string) {
  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" +
        apiKey,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text }],
            },
          ],
          generationConfig: {
            responseModalities: ["AUDIO"],
          },
        }),
      }
    );

    const result = await response.json();

    const base64 = result?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64) throw new Error("No audio returned");

    const byteString = atob(base64);
    const bytes = new Uint8Array(byteString.length);

    for (let i = 0; i < byteString.length; i++) {
      bytes[i] = byteString.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);

    return {
      text,
      transcript: text,
      url,
      blob,
      audio_mime: "audio/wav",
    };
  } catch (err) {
    console.error("TTS ERROR:", err);
    return { text, transcript: text, url: null, blob: null };
  }
}
