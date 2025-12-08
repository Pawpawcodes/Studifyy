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

// ⭐ Correct model names (latest stable)
const MODEL_FAST = "gemini-1.5-flash-latest";
const MODEL_REASONING = "gemini-1.5-pro-latest";
const MODEL_TTS = "gemini-1.5-flash-8b"; // supports audio output

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
// MAIN CHATBOT (orchestrator)
// ---------------------------------------------------------
export async function orchestrateRequest(
  query: string,
  user: UserProfile | null,
  files: UploadedFile[],
  history: string
): Promise<AgentResponse> {
  const prompt = `
You are Studify AI. Be clear, simple, and friendly.

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
    console.error("Orchestrator ERROR:", err);
    return { text: "Error: " + err.message, sources: [] };
  }
}

// ---------------------------------------------------------
// EXPLAIN TOPIC
// ---------------------------------------------------------
export async function explainTopic(topic: string, user: UserProfile, files: UploadedFile[]) {
  const prompt = `
Explain "${topic}" very simply.

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
    console.error("ExplainTopic ERROR:", err);
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
    console.error("SolveDoubt ERROR:", err);
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
    const model = genAI.getGenerativeModel({ model: MODEL_FAST });
    const result = await model.generateContent(prompt);

    return JSON.parse(result.response.text());
  } catch (err) {
    console.error("Quiz ERROR:", err);
    return [];
  }
}

// ---------------------------------------------------------
// FLASHCARDS
// ---------------------------------------------------------
export async function generateFlashcards(topic: string, count = 5) {
  const prompt = `
Generate ${count} flashcards for "${topic}".
Return ONLY JSON.
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
  } catch (err) {
    console.error("Flashcards ERROR:", err);
    return [];
  }
}

// ---------------------------------------------------------
// STUDY PLAN
// ---------------------------------------------------------
export async function generateStudyPlan(user: UserProfile, focus: string) {
  const prompt = `
Create a 7-day study plan.

Student:
${JSON.stringify(user)}

Focus: ${focus}

Return ONLY JSON.
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

// ---------------------------------------------------------
// TTS (REAL AUDIO) — WORKS IN BROWSER
// ---------------------------------------------------------
export async function generateTTS(text: string) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_TTS}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            audioConfig: {
              audioEncoding: "wav",
            },
          },
        }),
      }
    );

    const json = await response.json();
    console.log("TTS response:", json);

    const base64 =
      json?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64) throw new Error("No audio returned from Gemini.");

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);

    return { text, transcript: text, url, blob, audio_mime: "audio/wav" };
  } catch (err: any) {
    console.error("TTS ERROR:", err);
    return { text, transcript: text, url: null, blob: null };
  }
}
