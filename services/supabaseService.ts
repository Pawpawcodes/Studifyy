import { supabase } from '../supabaseClientFrontend';

import { UploadedFile, UserProfile } from '../types';

export const uploadFileToStorage = async (file: File, userId: string): Promise<UploadedFile | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    // 1. Upload to 'uploads' bucket
    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // 2. Insert metadata to DB
    const { data: uploadData, error: dbError } = await supabase
      .from('uploads')
      .insert({
        user_id: userId,
        filename: file.name,
        file_path: filePath,
        file_type: file.type.includes('pdf') ? 'pdf' : 'image',
        mime_type: file.type,
        size_bytes: file.size
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // 3. Trigger Edge Function for processing (Async)
    // We don't await this so UI is snappy
    supabase.functions.invoke('process-upload', {
      body: { uploadId: uploadData.id, userId }
    });

    // 4. Return local representation
    const { data: { signedUrl } } = await supabase.storage
      .from('uploads')
      .createSignedUrl(filePath, 3600);

    return {
      id: uploadData.id,
      name: file.name,
      type: file.type.includes('image') ? 'image' : 'pdf',
      content: 'Processing...', // Placeholder until processed
      uploadDate: new Date().toISOString(),
      storagePath: filePath,
      publicUrl: signedUrl || undefined,
      mimeType: file.type
    };

  } catch (error) {
    console.error('Upload failed:', error);
    return null;
  }
};

export const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    name: data.full_name || 'Student',
    level: data.level,
    avatarUrl: data.avatar_url,
    subjects: [], // Load from separate table if needed
    weakTopics: [], // In a real app, store these in DB
    strongTopics: [],
    streak: data.streak,
    studyHoursPerDay: 2,
    autoPlayAudio: false,
    performanceHistory: {}
  };
};

// Thin wrapper over the same `generate-tts` edge function used by
// `generateTTS` in geminiService, but returning only the URL.
export const fetchTTS = async (text: string): Promise<string | null> => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    let endpoint = "https://wkefepwnztesbjdyqybp.functions.supabase.co/generate-tts";
    if (supabaseUrl) {
      const match = supabaseUrl.match(/^https:\/\/([^.]+)\.supabase\.co/i);
      const ref = match?.[1];
      if (ref) {
        endpoint = `https://${ref}.functions.supabase.co/generate-tts`;
      } else {
        endpoint = supabaseUrl.replace(".supabase.co", ".functions.supabase.co") + "/generate-tts";
      }
    }

    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ text }),
    });

    if (!resp.ok) {
      const msg = await resp.text().catch(() => '');
      throw new Error(`generate-tts HTTP ${resp.status}: ${msg}`);
    }

    const json: any = await resp.json();
    return json?.url ?? null;
  } catch (e) {
    console.error('TTS Fetch Error:', e);
    return null;
  }
};
