import { GoogleGenerativeAI } from "@google/generative-ai";

import {
  UserProfile,
  UploadedFile,
  Flashcard,
  QuizQuestion,
  StudyPlanDay,
  AgentResponse,
} from "../types";

// ------------------------------------------------------------------
// 🔥 INIT GEMINI CLIENT
// ------------------------------------------------------------------
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.error("❌ Missing VITE_GEMINI_API_KEY in .env.local");
}

const genAI = new GoogleGenerativeAI(apiKey || "");

// Stable models
const MODEL_REASONING = "gemini-1.5-pro-latest";
const MODEL_FAST = "gemini-1.5-flash-latest";

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
// 🤖 MAIN CHATBOT — orchestrateRequest
// ------------------------------------------------------------------
export async function orchestrateRequest(
  query: string,
  userProfile: UserProfile | null,
  files: UploadedFile[],
  history: string
): Promise<AgentResponse> {
  const prompt = `
You are Studify AI, a helpful learning assistant.

Student Profile:
${JSON.stringify(userProfile ?? {}, null, 2)}

Conversation History:
${history}

User query:
"${query}"

Respond clearly and helpfully.
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
  } catch (error: any) {
    console.error("❌ orchestrateRequest ERROR:", error);
    return { text: "Error responding to your query.", sources: [] };
  }
}

// ------------------------------------------------------------------
// 📘 Explain Topic
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

    return {
      text: result.response.text(),
      sources: [],
    };
  } catch (error: any) {
    return { text: "Error explaining topic:\n" + error.message, sources: [] };
  }
}

// ------------------------------------------------------------------
// ❓ Solve Doubt
// ------------------------------------------------------------------
export async function solveDoubt(
  question: string,
  files: UploadedFile[]
): Promise<AgentResponse> {
  const prompt = `
Solve this doubt: "${question}"

Provide:
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
  } catch (error: any) {
    return { text: "Error solving doubt:\n" + error.message, sources: [] };
  }
}

// ------------------------------------------------------------------
// 📝 Quiz Generator
// ------------------------------------------------------------------
export async function generateQuiz(
  topic: string,
  difficulty: string
): Promise<QuizQuestion[]> {
  const prompt = `
Generate a quiz about "${topic}" (${difficulty}). Return ONLY JSON:

[
  {
    "id": "1",
    "question": "",
    "options": ["A","B","C","D"],
    "correctIndex": 0,
    "explanation": ""
  }
]
`;

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_FAST });
    const result = await model.generateContent(prompt);

    return JSON.parse(result.response.text());
  } catch (error) {
    console.error("Quiz ERROR:", error);
    return [];
  }
}

// ------------------------------------------------------------------
// 📚 Flashcards
// ------------------------------------------------------------------
export async function generateFlashcards(
  topic: string,
  count = 5
): Promise<Flashcard[]> {
  const prompt = `
Generate ${count} flashcards for "${topic}".  
Return ONLY JSON:

[
  { "front": "", "back": "", "topic": "${topic}" }
]
`;

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_FAST });
    const result = await model.generateContent(prompt);

    const cards = JSON.parse(result.response.text());

    return cards.map((c: any, i: number) => ({
      ...c,
      id: `fc-${Date.now()}-${i}`,
      difficulty: 1,
      nextReview: new Date().toISOString(),
    }));
  } catch (error) {
    console.error("Flashcards ERROR:", error);
    return [];
  }
}

// ------------------------------------------------------------------
// 🗓 Study Plan Generator
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

Return ONLY JSON like:
[
  { "day": "Day 1", "focusTopic": "...", "tasks": ["..."] }
]
`;

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_FAST });
    const result = await model.generateContent(prompt);

    return JSON.parse(result.response.text());
  } catch (error) {
    console.error("StudyPlan ERROR:", error);
    return [];
  }
}

// ------------------------------------------------------------------
// 🔊 TEMP TTS (Disabled safely)
// ------------------------------------------------------------------
export async function generateTTS(text: string) {
  console.warn("TTS disabled (no browser-safe TTS).");

  return {
    text,
    transcript: text,
    blob: null,
    url: null,
    audio_mime: "audio/wav",
  };
}
