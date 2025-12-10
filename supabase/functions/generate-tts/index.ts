// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

declare const Deno: any;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

    // NEW WORKING TTS MODEL
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text }],
          },
        ],
      }),
    });

    const json = await res.json();

    // Extract inlineData (Base64 + MIME)
    const audioPart =
      json?.candidates?.[0]?.content?.parts?.[0]?.inlineData;

    if (!audioPart?.data) {
      console.log("TTS DEBUG RESPONSE:", JSON.stringify(json));
      throw new Error("TTS: No inline audio returned");
    }

    // Return simpler format for frontend
    return new Response(
      JSON.stringify({
        audio: audioPart.data, // base64 string
        mimeType: audioPart.mimeType || "audio/mp3",
      }),
      {
        headers: { ...cors, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: cors },
    );
  }
});
