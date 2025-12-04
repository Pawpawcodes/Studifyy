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
// 🔥 INIT GEMINI FOR TEXT MODELS
// ------------------------------------------------------------------
const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
if (!geminiKey) {
  console.error("❌ Missing VITE_GEMINI_API_KEY");
}

const genAI = new GoogleGenerativeAI(geminiKey || "");

// Gemini models
const MODEL_FAST = "gemini-1.5-flash-latest";
const MODEL_REASONING = "gemini-1.5-pro-latest";

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

Give a clear, helpful reply.
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
    console.error("ExplainTopic ERROR:", err);
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
    console.error("solveDoubt ERROR:", err);
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
    console.error("StudyPlan ERROR:", err);
    return [];
  }
}

// ------------------------------------------------------------------
// 🔊 TEMP TTS — DISABLED (NO OPENAI IN BROWSER)
// ------------------------------------------------------------------
export async function generateTTS(text: string) {
  console.warn("TTS is currently disabled in frontend (no safe browser TTS).");
  return {
    text,
    transcript: text,
    blob: null,
    url: null,
    audio_mime: "audio/wav",
  };
} 
