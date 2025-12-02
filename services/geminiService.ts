import { GoogleGenAI, Schema, Type, Part, Modality } from "@google/genai";
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

// -----------------------------
// 🔥 INITIALIZE GEMINI CLIENT
// -----------------------------
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  // Fail fast in dev; in production this will also show in console
  throw new Error("❌ Missing VITE_GEMINI_API_KEY in environment.");
}

const ai = new GoogleGenAI({ apiKey });

// Model IDs – use stable, widely available models
const MODEL_FAST = "models/gemini-1.5-flash";
const MODEL_REASONING = "models/gemini-1.5-pro";
// Keep your TTS preview model (if it ever errors, we can swap to a flash model)
const MODEL_TTS = "models/gemini-2.5-flash-preview-tts";

// -----------------------------
// 🔧 HELPER: Write string into WAV header
// -----------------------------
function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// -----------------------------
// 🔧 HELPER: Convert raw PCM → WAV
// -----------------------------
function pcmToWav(pcmData: Uint8Array, sampleRate: number = 24000): Blob {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmData.length;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");

  // fmt
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  const wav = new Uint8Array(buffer);
  wav.set(pcmData, 44);

  return new Blob([buffer], { type: "audio/wav" });
}

// -----------------------------
// 🔍 Extract grounding (Google Search) sources
// -----------------------------
function extractSources(response: any): GroundingSource[] {
  const chunks =
    response.candidates?.[0]?.groundingMetadata?.groundingChunks ??
    response.response?.candidates?.[0]?.groundingMetadata?.groundingChunks;

  if (!chunks) return [];

  const seen = new Set<string>();
  const sources: GroundingSource[] = [];

  chunks.forEach((c: any) => {
    if (c.web?.uri && c.web?.title && !seen.has(c.web.uri)) {
      seen.add(c.web.uri);
      sources.push({ title: c.web.title, uri: c.web.uri });
    }
  });

  return sources;
}

// -----------------------------
// 🔧 Prepare file uploads for Gemini
// -----------------------------
function prepareFileParts(files: UploadedFile[]): Part[] {
  return files
    .filter((f) => f.data && f.mimeType)
    .map((f) => ({
      inlineData: {
        mimeType: f.mimeType!,
        data: f.data!,
      },
    }));
}

// -----------------------------
// 🔊 TTS (Text → Speech)
// -----------------------------
export const generateTTS = async (text: string): Promise<TTSResponse> => {
  if (!text) throw new Error("No text provided for TTS");

  try {
    const cleanText = text.slice(0, 4000);

    const response = await ai.models.generateContent({
      model: MODEL_TTS,
      contents: [
        {
          role: "user",
          parts: [{ text: cleanText }],
        },
      ],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Aoede" },
          },
        },
      },
    });

    const base64Audio =
      response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ??
      response.response?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      throw new Error("Gemini returned no audio.");
    }

    const binary = atob(base64Audio);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const wav = pcmToWav(bytes, 24000);

    return {
      text: cleanText,
      transcript: cleanText,
      audio_base64: base64Audio,
      audio_mime: "audio/wav",
      blob: wav,
      url: URL.createObjectURL(wav),
    };
  } catch (error) {
    console.error("TTS Error:", error);
    return {
      text,
      transcript: text,
      audio_base64: null,
      audio_mime: "error",
      blob: undefined,
      url: undefined,
    };
  }
};

// -----------------------------
// 🤖 ORCHESTRATOR AGENT
// -----------------------------
export const orchestrateRequest = async (
  query: string,
  userProfile: UserProfile | null,
  files: UploadedFile[],
  history: string
): Promise<AgentResponse> => {
  const fileParts = prepareFileParts(files);

  const systemInstruction = `
You are Studify AI, an advanced learning assistant.
You coordinate different tools (explain, quiz, doubt solving, planning, etc.)
and always respond clearly and helpfully for students.
Use grounded web search only when truly necessary.
User profile: ${JSON.stringify(userProfile ?? {}, null, 2)}
`;

  const prompt = `
Conversation History:
${history}

User Query: ${query}
`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_REASONING,
      contents: [
        {
          role: "user",
          parts: [...fileParts, { text: prompt }],
        },
      ],
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
      },
    });

    const text =
      (response as any).text ??
      response.response?.candidates?.[0]?.content?.parts
        ?.map((p: any) => p.text ?? "")
        .join("\n") ??
      "";

    return {
      text: text || "I'm having trouble right now.",
      sources: extractSources(response),
    };
  } catch (error) {
    console.error("Orchestrator Error:", error);
    return { text: "Error. Try again." };
  }
};

// -----------------------------
// 📘 Explain Topic Agent
// -----------------------------
export const explainTopic = async (
  topic: string,
  user: UserProfile,
  files: UploadedFile[]
): Promise<AgentResponse> => {
  const fileParts = prepareFileParts(files);

  const prompt = `
Explain the topic: "${topic}" for a student.

Student profile:
${JSON.stringify(user ?? {}, null, 2)}

Requirements:
1. Start with an intuitive overview in 3–5 sentences.
2. Then explain step-by-step, like teaching a friend.
3. Use small examples where helpful.
4. End with a short "Key points" bullet list.
`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_REASONING,
      contents: [
        {
          role: "user",
          parts: [...fileParts, { text: prompt }],
        },
      ],
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text =
      (response as any).text ??
      response.response?.candidates?.[0]?.content?.parts
        ?.map((p: any) => p.text ?? "")
        .join("\n") ??
      "";

    return {
      text: text || "Could not explain.",
      sources: extractSources(response),
    };
  } catch (e: any) {
    console.error("ExplainTopic error:", e);

    const message =
      e?.message ||
      e?.error?.message ||
      JSON.stringify(e, null, 2);

    // Surface real error text so you can debug in the UI
    return {
      text: `Error explaining topic:\n\n${message}`,
      sources: [],
    };
  }
};

// -----------------------------
// 🧠 Doubt Solver Agent
// -----------------------------
export const solveDoubt = async (
  question: string,
  files: UploadedFile[]
): Promise<AgentResponse> => {
  const fileParts = prepareFileParts(files);

  const prompt = `
Solve this student doubt: "${question}"

1. First restate the doubt in your own words.
2. Then give a clear, step-by-step solution.
3. Highlight any common mistakes.
4. Finish with a short recap.
`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_REASONING,
      contents: [
        {
          role: "user",
          parts: [...fileParts, { text: prompt }],
        },
      ],
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text =
      (response as any).text ??
      response.response?.candidates?.[0]?.content?.parts
        ?.map((p: any) => p.text ?? "")
        .join("\n") ??
      "";

    return {
      text: text || "Could not solve the doubt.",
      sources: extractSources(response),
    };
  } catch (e) {
    console.error("SolveDoubt error:", e);
    return { text: "Error solving doubt.", sources: [] };
  }
};

// -----------------------------
// 📝 Quiz Generator
// -----------------------------
export const generateQuiz = async (
  topic: string,
  difficulty: string
): Promise<QuizQuestion[]> => {
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

  const prompt = `Generate a ${difficulty} quiz on "${topic}". 
Return only JSON matching the schema.`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const text =
      (response as any).text ??
      response.response?.candidates?.[0]?.content?.parts
        ?.map((p: any) => p.text ?? "")
        .join("\n");

    if (!text) return [];
    return JSON.parse(text) as QuizQuestion[];
  } catch (err) {
    console.error("generateQuiz error:", err);
    return [];
  }
};

// -----------------------------
// 📚 Flashcards Agent
// -----------------------------
export const generateFlashcards = async (
  topic: string,
  count: number = 5
): Promise<Flashcard[]> => {
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

  const prompt = `Create ${count} concise flashcards for "${topic}". 
Return only JSON that matches the schema.`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const text =
      (response as any).text ??
      response.response?.candidates?.[0]?.content?.parts
        ?.map((p: any) => p.text ?? "")
        .join("\n");

    if (!text) return [];

    const cards = JSON.parse(text) as Flashcard[];

    return cards.map((c, i) => ({
      ...c,
      id: c.id || `fc-${Date.now()}-${i}`,
      nextReview: c.nextReview || new Date().toISOString(),
    }));
  } catch (err) {
    console.error("generateFlashcards error:", err);
    return [];
  }
};

// -----------------------------
// 🗓️ Study Planner Agent
// -----------------------------
export const generateStudyPlan = async (
  user: UserProfile,
  focus: string
): Promise<StudyPlanDay[]> => {
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

${JSON.stringify(user ?? {}, null, 2)}

Main focus: ${focus}

Each day:
- Choose a focusTopic
- Provide 3–6 specific tasks
Return only JSON that matches the schema.
`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const text =
      (response as any).text ??
      response.response?.candidates?.[0]?.content?.parts
        ?.map((p: any) => p.text ?? "")
        .join("\n");

    if (!text) return [];
    return JSON.parse(text) as StudyPlanDay[];
  } catch (err) {
    console.error("generateStudyPlan error:", err);
    return [];
  }
};
