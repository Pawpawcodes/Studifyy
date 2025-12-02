import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  UserProfile,
  UploadedFile,
  Flashcard,
  QuizQuestion,
  StudyPlanDay,
  AgentResponse
} from "../types";

// ------------------------------------------------------------------
// 🔥 INIT
// ------------------------------------------------------------------
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
if (!apiKey) throw new Error("Missing VITE_GEMINI_API_KEY");

const genAI = new GoogleGenerativeAI(apiKey);

// MODELS
const MODEL_FAST = "gemini-1.5-flash-latest";
const MODEL_REASONING = "gemini-1.5-pro-latest";

// ------------------------------------------------------------------
// 🔧 Convert Files
// ------------------------------------------------------------------
function prepareFiles(files: UploadedFile[]) {
  return (files || [])
    .filter((f) => f.data && f.mimeType)
    .map((f) => ({
      inlineData: {
        data: f.data!,
        mimeType: f.mimeType!
      }
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
Explain the topic: "${topic}" clearly.

Student:
${JSON.stringify(user, null, 2)}

Return:
- Simple explanation
- Steps
- Example
- Summary
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
    console.error("Explain error:", err);
    return {
      text: `Error explaining topic:\n${err.message || JSON.stringify(err)}`,
      sources: []
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
Solve this doubt: "${question}"

Explain:
- What the doubt means
- How to solve step-by-step
- Common mistakes
- Final summary
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

  } catch (e: any) {
    return {
      text: `Error solving doubt:\n${e.message || JSON.stringify(e)}`,
      sources: []
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
Generate a JSON quiz for topic "${topic}" (${difficulty} difficulty).

Format exactly:
[
  {
    "id": "1",
    "question": "...",
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

  } catch (e) {
    console.error("Quiz error:", e);
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
Create exactly ${count} flashcards for topic "${topic}" in JSON:

[
  { "front": "...", "back": "...", "topic": "${topic}" }
]
`;

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_FAST });
    const result = await model.generateContent(prompt);
    const cards = JSON.parse(result.response.text());

    return cards.map((c: any, i: number) => ({
      ...c,
      id: `card-${Date.now()}-${i}`,
      nextReview: new Date().toISOString()
    }));

  } catch (e) {
    console.error("Flashcards error:", e);
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
Create a 7-day study plan for:

${JSON.stringify(user, null, 2)}

Focus: ${focus}

Return JSON:
[
  { "day": "Day 1", "focusTopic": "...", "tasks": ["task1","task2"] }
]
`;

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_FAST });
    const result = await model.generateContent(prompt);

    return JSON.parse(result.response.text());

  } catch (e) {
    console.error("Study plan error:", e);
    return [];
  }
}
// ------------------------------------------------------------------
// 🔊 TEMPORARY TTS PLACEHOLDER (since @google/generative-ai has no TTS)
// ------------------------------------------------------------------
export async function generateTTS(text: string) {
  console.warn("⚠ generateTTS() is a placeholder — Gemini TTS not supported in this SDK.");

  // Produce 0.4 seconds of silence so the audio player doesn't break
  const sampleRate = 24000;
  const durationSeconds = 0.4;
  const numSamples = Math.floor(sampleRate * durationSeconds);

  // Create silent PCM audio
  const pcmData = new Uint8Array(numSamples);

  // Convert PCM → WAV
  function pcmToWav(pcm: Uint8Array, sampleRate: number) {
    const numChannels = 1;
    const bitsPerSample = 16;
    const blockAlign = numChannels * bitsPerSample / 8;
    const byteRate = sampleRate * blockAlign;
    const wavBuffer = new ArrayBuffer(44 + pcm.length);
    const view = new DataView(wavBuffer);

    function writeString(offset: number, str: string) {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    }

    writeString(0, "RIFF");
    view.setUint32(4, 36 + pcm.length, true);
    writeString(8, "WAVE");

    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);

    writeString(36, "data");
    view.setUint32(40, pcm.length, true);

    new Uint8Array(wavBuffer).set(pcm, 44);
    return new Blob([wavBuffer], { type: "audio/wav" });
  }

  const wavBlob = pcmToWav(pcmData, sampleRate);
  const url = URL.createObjectURL(wavBlob);

  return {
    text,
    transcript: text,
    audio_base64: "",
    audio_mime: "audio/wav",
    blob: wavBlob,
    url
  };
}
