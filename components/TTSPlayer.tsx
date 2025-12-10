import React, { useState, useEffect } from "react";
import {
  Play,
  Pause,
  Square,
  Download,
  Loader2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { generateTTS } from "../services/geminiService";
import { useStore } from "../context/StoreContext";
import { useAudio } from "../context/AudioContext";

interface TTSPlayerProps {
  text: string;
  autoPlay?: boolean;
  className?: string;
  simple?: boolean;
}

export const TTSPlayer: React.FC<TTSPlayerProps> = ({
  text,
  autoPlay = false,
  className = "",
  simple = false,
}) => {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioMime, setAudioMime] = useState<string>("audio/mpeg"); // NEW: track mime type
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const [playerId, setPlayerId] = useState(() =>
    Math.random().toString(36).substr(2, 9),
  );

  useEffect(() => {
    setPlayerId(Math.random().toString(36).substr(2, 9));
    setAudioUrl(null);
    setError(false);
  }, [text]);

  const { play, pause, resume, stop, currentId, isPlaying } = useAudio();
  const { user } = useStore();

  const isCurrent = currentId === playerId;
  const isActive = isCurrent && isPlaying;
  const isPaused = isCurrent && !isPlaying;

  // Auto-play
  useEffect(() => {
    const shouldAutoPlay = autoPlay || (user?.autoPlayAudio ?? false);
    if (
      shouldAutoPlay &&
      text &&
      !audioUrl &&
      !loading &&
      !error &&
      !currentId
    ) {
      generateAndPlay();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, autoPlay, user?.autoPlayAudio]);

  const generateAndPlay = async () => {
    if (loading) return;

    if (audioUrl) {
      play(playerId, audioUrl);
      return;
    }

    setLoading(true);
    setError(false);

    try {
      const response = await generateTTS(text);

      if (response.url) {
        setAudioUrl(response.url);
        setAudioMime(response.audio_mime || "audio/mpeg"); // SET MIME TYPE HERE
        play(playerId, response.url);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error("TTS Gen Error:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isActive) {
      pause();
    } else if (isPaused) {
      resume();
    } else {
      generateAndPlay();
    }
  };

  const handleStop = (e: React.MouseEvent) => {
    e.stopPropagation();
    stop();
  };

  // SIMPLE / CHAT MODE
  if (simple) {
    return (
      <button
        onClick={handlePlayPause}
        disabled={loading}
        className={`p-1.5 rounded-full transition-colors flex items-center justify-center ${
          isActive
            ? "text-white bg-primary"
            : isPaused
              ? "text-primary bg-primary/10"
              : "text-slate-400 hover:text-primary hover:bg-slate-100"
        } ${className}`}
        title={isActive ? "Pause" : isPaused ? "Resume" : "Listen"}
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : isActive ? (
          <Pause size={16} />
        ) : isPaused ? (
          <Play size={16} />
        ) : (
          <Volume2 size={16} />
        )}
      </button>
    );
  }

  // FULL CONTROL BAR
  return (
    <div
      className={`flex items-center space-x-1 bg-slate-50 border border-slate-200 rounded-full px-2 py-1 ${className}`}
    >
      {/* PLAY/PAUSE */}
      <button
        onClick={handlePlayPause}
        disabled={loading}
        className={`flex items-center justify-center w-8 h-8 rounded-full border transition-all shadow-sm ${
          isActive
            ? "bg-primary border-primary text-white"
            : "bg-white border-slate-200 text-primary hover:bg-slate-100"
        }`}
        title={isActive ? "Pause" : "Play"}
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : isActive ? (
          <Pause size={14} />
        ) : (
          <Play size={14} className="ml-0.5" />
        )}
      </button>

      {/* STOP BUTTON */}
      {isCurrent && (
        <button
          onClick={handleStop}
          className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
          title="Stop"
        >
          <Square size={12} />
        </button>
      )}

      {/* DOWNLOAD BUTTON — now correct extension */}
      {audioUrl && (
        <a
          href={audioUrl}
          download={`studify-audio.${audioMime === "audio/mpeg" ? "mp3" : "wav"}`}
          className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100"
          title="Download Audio"
          onClick={(e) => e.stopPropagation()}
        >
          <Download size={14} />
        </a>
      )}

      {/* ERROR ICON */}
      {error && (
        <span className="flex items-center" title="Audio generation failed">
          <VolumeX size={14} className="text-red-400 ml-1" />
        </span>
      )}

      {/* Idle label */}
      {!audioUrl && !loading && !error && (
        <span
          className="text-xs text-slate-400 font-medium px-1 cursor-pointer select-none"
          onClick={handlePlayPause}
        >
          Listen
        </span>
      )}
    </div>
  );
};
