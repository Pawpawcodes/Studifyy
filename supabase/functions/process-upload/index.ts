// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
// @ts-ignore
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";

declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { uploadId, userId } = await req.json();

    // Initialize Admin Client (Service Role)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY") ?? "");

    // 1. Get File Metadata
    const { data: uploadData, error: dbError } = await supabase
      .from("uploads")
      .select("*")
      .eq("id", uploadId)
      .single();

    if (dbError) throw dbError;

    // 2. Download File
    const { data: fileData, error: dlError } = await supabase.storage
      .from("uploads")
      .download(uploadData.file_path);

    if (dlError) throw dlError;

    // 3. Extract Text via Gemini (Multimodal)
    const arrayBuffer = await fileData.arrayBuffer();
    const base64Data = btoa(
      String.fromCharCode(...new Uint8Array(arrayBuffer)),
    );

    // Use Flash for fast OCR
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: uploadData.mime_type,
          data: base64Data,
        },
      },
      "Extract all text from this document. Return plain text only. If it's handwritten, transcribe it accurately.",
    ]);

    const text = result.response.text();

    if (!text) throw new Error("No text extracted");

    // 4. Create Embedding (Optional: if Vector extension enabled)
    // We store the chunk regardless.
    let embedding = null;
    try {
      const embeddingModel = genAI.getGenerativeModel({
        model: "text-embedding-004",
      });
      const embeddingResult = await embeddingModel.embedContent(
        text.substring(0, 2000),
      );
      embedding = embeddingResult.embedding.values;
    } catch (e) {
      console.error("Embedding failed (optional step)", e);
    }

    // 5. Save Chunk
    const { error: insertError } = await supabase.from("doc_chunks").insert({
      upload_id: uploadId,
      user_id: userId,
      chunk_index: 0,
      content: text,
      embedding: embedding,
    });

    if (insertError) throw insertError;

    // 6. Mark Processed
    await supabase
      .from("uploads")
      .update({ processed: true })
      .eq("id", uploadId);

    return new Response(
      JSON.stringify({ success: true, textLength: text.length }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
