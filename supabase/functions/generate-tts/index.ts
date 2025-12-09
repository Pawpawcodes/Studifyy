// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { text, prompt } = await req.json();
    const inputText = text ?? prompt;

    if (!inputText) throw new Error("No text provided");

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-speech:generateContent?key=" +
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
          outputMimeType: "audio/mp3",
        },
      }),
    });

    const result = await geminiResp.json();
    if (!geminiResp.ok) throw new Error(JSON.stringify(result));

    const audio =
      result.response?.candidates?.[0]?.content?.parts?.[0]?.inlineData;

    if (!audio?.data) throw new Error("No audio returned from Gemini");

    return new Response(JSON.stringify({ audio }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
