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

    // 1) Use gemini-1.5-flash:generateAudio (NOT generateContent)
    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/" +
      "gemini-1.5-flash:generateAudio?key=" +
      apiKey;

    // 2) Request body MUST be { input: { text }, audioConfig: { audioEncoding: "MP3" } }
    const geminiResp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text: inputText },
        audioConfig: { audioEncoding: "MP3" },
      }),
    });

    const result = await geminiResp.json();
    if (!geminiResp.ok) throw new Error(JSON.stringify(result));

    // 3) Extract audio from result.audio[0].data (base64)
    const base64Audio: string | undefined = result.audio?.[0]?.data;
    if (!base64Audio) throw new Error("No audio returned from Gemini");

    // 4) Return { "audio": "<base64string>" }
    return new Response(JSON.stringify({ audio: base64Audio }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
