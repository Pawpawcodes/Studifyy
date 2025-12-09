// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

declare const Deno: any;

// Basic CORS headers for browser clients
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { text, prompt } = await req.json();
    const inputText: string | undefined = text ?? prompt;

    if (!inputText) {
      throw new Error("No text provided");
    }

    // Read API key from environment (no hardcoded keys)
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY");
    }

    // Call Gemini 1.5 Flash Speech model via REST API
    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/" +
      "gemini-1.5-flash-speech:generateContent?key=" +
      apiKey;

    const geminiResp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: inputText }],
          },
        ],
        generationConfig: {
          responseMimeType: "audio/mp3",
        },
      }),
    });

    if (!geminiResp.ok) {
      const errText = await geminiResp.text();
      throw new Error(`Gemini API Error: ${errText}`);
    }

    const result = await geminiResp.json();

    // Extract audio as inlineData, exactly from
    // result.response.candidates[0].content.parts[0].inlineData
    const audio =
      result.response?.candidates?.[0]?.content?.parts?.[0]?.inlineData ?? null;

    if (!audio || !audio.data) {
      throw new Error("No audio generated from Gemini");
    }

    // Return just { audio } as requested
    return new Response(JSON.stringify({ audio }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error?.message ?? "Unknown error" }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});
