import { GoogleGenerativeAI, Schema, Type, Modality, Part } from "@google/generative-ai";
import {
  UserProfile,
  UploadedFile,
  Flashcard,
  QuizQuestion,
  StudyPlanDay,
  AgentResponse,
  GroundingSource,
  TTSResponse,
} from "../types";

// ------------------------------------------------------------------
// 🔥 INITIALIZE GEMINI CLIENT
// ------------------------------------------------------------------
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("❌ Missing VITE_GEMINI_API_KEY (set it in .env.local + Netlify)");
}

const ai = new GoogleGenerativeAI(apiKey);

// ------------------------------------------------------------------
// ✅ MODEL CHOICES — stable, correct IDs
// ------------------------------------------------------------------
const MODEL_FAST = "gemini-1.5-flash-latest";
const MODEL_REASONING = "gemini-1.5-pro-latest";
const MODEL_TTS = "gemini-1.5-flash"; // stable model with audio support
 // safest for TTS (or use preview-tts if needed)

// ------------------------------------------------------------------
// 🔧 Utility Helpers
// ------------------------------------------------------------------
function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

function pcmToWav(pcmData: Uint8Array, sampleRate = 24000): Blob {
  const numChannels = 1;
  const bitsPerSample = 16;
  const headerSize = 44;

  const buffer = new ArrayBuffer(headerSize + pcmData.length);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + pcmData.length, true);
  writeString(view, 8, "WAVE");

  // fmt chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bitsPerSample / 8, true);
  view.setUint16(32, numChannels * bitsPerSample / 8, true);
  view.setUint16(34, bitsPerSample, true);

  // data chunk
  writeString(view, 36, "data");
  view.setUint32(40, pcmData.length, true);

  const wav = new Uint8Array(buffer);
  wav.set(pcmData, 44);

  return new Blob([wav], { type: "audio/wav" });
}

function extractSources(resp: any): GroundingSource[] {
  const chunks =
    resp.candidates?.[0]?.groundingMetadata?.groundingChunks ||
    resp.response?.candidates?.[0]?.groundingMetadata?.groundingChunks;

  if (!chunks) return [];

  const seen = new Set();
  const sources: GroundingSource[] = [];

  for (const c of chunks) {
    if (c.web?.uri && !seen.has(c.web.uri)) {
      sources.push({ title: c.web.title, uri: c.web.uri });
      seen.add(c.web.uri);
    }
  }

  return sources;
}

function prepareFiles(files: UploadedFile[]): Part[] {
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
// 🔊 TEXT-TO-SPEECH
// ------------------------------------------------------------------
export async function generateTTS(text: string): Promise<TTSResponse> {
  try {
    const result = await ai.generateContent({
      model: MODEL_TTS,
      contents: [{ role: "user", parts: [{ text }] }],
      generationConfig: {
        responseModalities: [Modality.AUDIO],
      },
    });

    const audio = result.response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audio) throw new Error("TTS audio missing");

    const binary = atob(audio);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const wav = pcmToWav(bytes);

    return {
      text,
      transcript: text,
      audio_base64: audio,
      audio_mime: "audio/wav",
      blob: wav,
      url: URL.createObjectURL(wav),
    };
  } catch (err) {
    console.error("TTS Error:", err);
    return { text, transcript: text, audio_mime: "error" };
  }
}

// ------------------------------------------------------------------
// 🧠 EXPLAIN TOPIC
// ------------------------------------------------------------------
export async function explainTopic(
  topic: string,
  user: UserProfile,
  files: UploadedFile[]
): Promise<AgentResponse> {
  const prompt = `
Explain the topic "${topic}" clearly for a student.

Student:
${JSON.stringify(user, null, 2)}

Return:
1. Intuitive overview
2. Step-by-step explanation
3. Small examples
4. Key points summary
`;

  try {
    const result = await ai.generateContent({
      model: MODEL_REASONING,
      contents: [
        {
          role: "user",
          parts: [...prepareFiles(files), { text: prompt }],
        },
      ],
    });

    const text =
      result.response.text() ||
      result.response.candidates?.[0]?.content?.parts?.map((p) => p.text).join("\n");

    return { text, sources: extractSources(result.response) };
  } catch (err: any) {
    console.error("ExplainTopic Error:", err);
    return {
      text: `Error explaining topic:\n\n${err.message || JSON.stringify(err)}`,
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
Solve this student's doubt: "${question}"

Steps:
1. Restate the doubt
2. Give a clear step-by-step solution
3. Highlight mistakes to avoid
4. Give a short summary
`;

  try {
    const result = await ai.generateContent({
      model: MODEL_REASONING,
      contents: [
        {
          role: "user",
          parts: [...prepareFiles(files), { text: prompt }],
        },
      ],
    });

    const text = result.response.text();
    return { text, sources: extractSources(result.response) };
  } catch (err: any) {
    console.error("solveDoubt Error:", err);
    return {
      text: `Error solving doubt:\n\n${err.message || JSON.stringify(err)}`,
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
  const schema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING },
        question: { type: Type.STRING },
        options: { type: Type.ARRAY, items: { type: Type.STRING } },
        correctIndex: { type: Type.INTEGER },
        explanation: { type: Type.STRING },
      },
      required: ["id", "question", "options", "correctIndex", "explanation"],
    },
  };

  const prompt = `Generate a ${difficulty} quiz on "${topic}". Return ONLY valid JSON.`;  

  try {
    const result = await ai.generateContent({
      model: MODEL_FAST,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    return JSON.parse(result.response.text());
  } catch (err) {
    console.error("Quiz Error:", err);
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
  const schema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING },
        front: { type: Type.STRING },
        back: { type: Type.STRING },
        topic: { type: Type.STRING },
        difficulty: { type: Type.NUMBER },
        nextReview: { type: Type.STRING },
      },
      required: ["front", "back", "topic"],
    },
  };

  const prompt = `Create ${count} flashcards for "${topic}". Return JSON only.`;

  try {
    const result = await ai.generateContent({
      model: MODEL_FAST,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    return JSON.parse(result.response.text()).map((c: any, i: number) => ({
      ...c,
      id: c.id || `fc-${Date.now()}-${i}`,
      nextReview: c.nextReview || new Date().toISOString(),
    }));
  } catch (err) {
    console.error("Flashcards Error:", err);
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
  const schema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        day: { type: Type.STRING },
        focusTopic: { type: Type.STRING },
        tasks: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["day", "focusTopic", "tasks"],
    },
  };

  const prompt = `
Generate a 7-day study plan for this student:

${JSON.stringify(user, null, 2)}

Main Focus: ${focus}
Return ONLY JSON.
`;

  try {
    const result = await ai.generateContent({
      model: MODEL_FAST,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    return JSON.parse(result.response.text());
  } catch (err) {
    console.error("StudyPlan Error:", err);
    return [];
  }
}
