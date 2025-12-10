import React, { createContext, useContext, useState } from "react";
import { generateTTS } from "../services/geminiService";
import { useAudio } from "./AudioContext";

interface TTSContextType {
  play: (text: string) => Promise<void>;
  stop: () => void;
  loading: boolean;
  error: string | null;
  currentText: string | null;
}

const TTSContext = createContext<TTSContextType | undefined>(undefined);

export const TTSProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { play: playAudio, stop: stopAudio } = useAudio();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentText, setCurrentText] = useState<string | null>(null);

  const play = async (text: string) => {
    const trimmed = text?.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setCurrentText(trimmed);

    try {
      const res = await generateTTS(trimmed);
      if (res.url) {
        await playAudio("global-tts", res.url);
      } else {
        setError("No audio returned from TTS");
      }
    } catch (e: any) {
      console.error("Global TTS play error", e);
      setError(e?.message || "TTS failed");
    } finally {
      setLoading(false);
    }
  };

  const stop = () => {
    setCurrentText(null);
    stopAudio();
  };

  return (
    <TTSContext.Provider value={{ play, stop, loading, error, currentText }}>
      {children}
    </TTSContext.Provider>
  );
};

export const useTTS = () => {
  const ctx = useContext(TTSContext);
  if (!ctx) throw new Error("useTTS must be used within a TTSProvider");
  return ctx;
};

// Optional simple button component to trigger TTS
export const TTSButton: React.FC<{
  text: string;
  label?: string;
  className?: string;
}> = ({ text, label = "Listen", className = "" }) => {
  const { play, loading } = useTTS();

  return (
    <button
      type="button"
      onClick={() => play(text)}
      disabled={loading || !text}
      className={className}
    >
      {loading ? "..." : label}
    </button>
  );
};
