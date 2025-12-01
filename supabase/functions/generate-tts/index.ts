// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function hashText(text: string) {
  const msgUint8 = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { text, voiceId = 'default' } = await req.json();
    if (!text) throw new Error("No text provided");

    const textHash = await hashText(text + voiceId);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Check Cache
    const { data: cached } = await supabase
      .from('tts_cache')
      .select('storage_path')
      .eq('text_hash', textHash)
      .eq('voice_id', voiceId)
      .single();

    if (cached) {
      const { data } = supabase.storage.from('tts').getPublicUrl(cached.storage_path);
      return new Response(JSON.stringify({ url: data.publicUrl, cached: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 2. Generate Audio (Gemini REST API)
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;
    
    const geminiResp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: { parts: [{ text }] },
            config: { 
                responseModalities: ["AUDIO"],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' }}}
            }
        })
    });
    
    if (!geminiResp.ok) {
        const errText = await geminiResp.text();
        throw new Error(`Gemini API Error: ${errText}`);
    }

    const geminiJson = await geminiResp.json();
    const base64Audio = geminiJson.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) throw new Error("No audio generated from Gemini");

    // 3. Convert Base64 to Bytes
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    
    // 4. Upload to Storage
    const fileName = `${textHash}.mp3`;
    
    const { error: uploadError } = await supabase.storage
      .from('tts')
      .upload(fileName, bytes, { contentType: 'audio/mp3', upsert: true });

    if (uploadError) throw uploadError;

    // 5. Save Cache Entry
    await supabase.from('tts_cache').insert({
      text_hash: textHash,
      voice_id: voiceId,
      storage_path: fileName
    });

    const { data: publicUrlData } = supabase.storage.from('tts').getPublicUrl(fileName);

    return new Response(JSON.stringify({ url: publicUrlData.publicUrl, cached: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
