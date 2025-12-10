// ---------------------------------------------------------
// FIXED TTS (Supabase Edge Function)
// ---------------------------------------------------------
export async function generateTTS(text: string) {
  try {
    const trimmed = text?.trim();
    if (!trimmed) {
      return { text: "", transcript: "", url: null, blob: null };
    }

    const response = await fetch(FUNCTIONS_TTS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ text: trimmed }),
    });

    if (!response.ok) {
      const msg = await response.text().catch(() => "");
      throw new Error(`generate-tts HTTP ${response.status}: ${msg}`);
    }

    // NEW backend response shape:
    // { audio: "<base64>", mimeType: "audio/mp3" }
    const data = await response.json();

    const base64 = data.audio;
    const mime = data.mimeType || "audio/mpeg";

    if (!base64) throw new Error("Missing 'audio' in TTS response");

    // Convert base64 → Blob
    const audioBinary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const blob = new Blob([audioBinary], { type: mime });

    // Create a browser-playable Object URL
    const url = URL.createObjectURL(blob);

    return {
      text: trimmed,
      transcript: trimmed,
      url,      // PLAY THIS IN YOUR PLAYER
      blob,     // RAW AUDIO BLOB
      audio_mime: mime,
      audio_base64: base64,
    };
  } catch (err) {
    console.error("TTS ERROR:", err);
    return {
      text,
      transcript: text,
      url: null,
      blob: null,
      audio_mime: undefined,
      audio_base64: null,
    };
  }
}
