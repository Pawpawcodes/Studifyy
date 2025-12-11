// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

declare const Deno: any;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const { text } = await req.json();
    if (!text) {
      return new Response(JSON.stringify({ error: "Missing text" }), {
        status: 400,
        headers: cors,
      });
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY");
    }

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/` +
      `gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;

    const body = {
      contents: [
        {
          role: "user",
          parts: [{ text }],
        },
      ],
      generationConfig: {
        responseModalities: ["AUDIO"],
        audioFormat: "mp3",
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: "Charon" }
        }
      }
    };

    console.log("Sending to Gemini:", JSON.stringify(body));

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    console.log("Gemini response:", JSON.stringify(data));

    const inline =
      data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;

    if (!inline?.data) {
      throw new Error("Gemini did not return audio");
    }

    return new Response(
      JSON.stringify({
        audio: inline.data,
        mimeType: inline.mimeType || "audio/mp3",
      }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("TTS Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: cors,
    });
  }
});
