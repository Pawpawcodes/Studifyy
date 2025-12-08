import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, Download, Loader2, Volume2, VolumeX } from 'lucide-react';
import { generateTTS } from '../services/geminiService';
import { useStore } from '../context/StoreContext';
import { useAudio } from '../context/AudioContext';

interface TTSPlayerProps {
  text: string;
  autoPlay?: boolean;
  className?: string;
  simple?: boolean;
}

export const TTSPlayer: React.FC<TTSPlayerProps> = ({
  text,
  autoPlay = false,
  className = '',
  simple = false
}) => {

  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // Unique ID for this player
  const [playerId, setPlayerId] = useState(
    () => Math.random().toString(36).substring(2, 9)
  );

  const { play, pause, resume, stop, currentId, isPlaying } = useAudio();
  const { user } = useStore();

  const isCurrent = currentId === playerId;
  const isActive = isCurrent && isPlaying;
  const isPaused = isCurrent && !isPlaying;

  // -----------------------------------------------------
  // RESET ON TEXT CHANGE (important)
  // -----------------------------------------------------
  useEffect(() => {
    const newId = Math.random().toString(36).substring(2, 9);
    setPlayerId(newId);
    setAudioUrl(null);
    setError(false);
  }, [text]);


  // -----------------------------------------------------
  // GENERATE AUDIO + PLAY
  // -----------------------------------------------------
  const generateAndPlay = async () => {
    if (loading) return;

    // If already generated, just play
    if (audioUrl) {
      play(playerId, audioUrl);
      return;
    }

    try {
      setLoading(true);
      const data = await generateTTS(text);

      if (!data.url) {
        setError(true);
        return;
      }

      setAudioUrl(data.url);
      play(playerId, data.url);

    } catch (err) {
      console.error("TTS Error:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };


  // -----------------------------------------------------
  // PLAY / PAUSE / RESUME HANDLER
  // -----------------------------------------------------
  const handlePlayPause = (e?: React.MouseEvent) => {
    e?.stopPropagation();

    if (loading) return;

    if (isActive) {
      pause();
    } else if (isPaused) {
      resume();
    } else {
      generateAndPlay();
    }
  };


  // -----------------------------------------------------
  // STOP BUTTON (RESET)
  // -----------------------------------------------------
  const handleStop = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    stop();
  };


  // -----------------------------------------------------
  // AUTO-PLAY FIX
  // -----------------------------------------------------
  useEffect(() => {
    const shouldAutoPlay = autoPlay || (user?.autoPlayAudio ?? false);

    // only autoplay when:
    // - we have text
    // - no audio generated yet
    // - not already playing something else
    if (
      shouldAutoPlay &&
      text &&
      !audioUrl &&
      !loading &&
      !error &&
      currentId === null
    ) {
      generateAndPlay();
    }
  }, [text]);


  // -----------------------------------------------------
  // SIMPLE VERSION (ICON ONLY)
  // -----------------------------------------------------
  if (simple) {
    return (
      <button
        onClick={handlePlayPause}
        disabled={loading}
        className={`p-1.5 rounded-full transition flex items-center justify-center ${
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


  // -----------------------------------------------------
  // FULL PLAYER BAR
  // -----------------------------------------------------
  return (
    <div
      className={`flex items-center space-x-1 bg-slate-50 border border-slate-200 rounded-full px-2 py-1 ${className}`}
    >
      {/* Play / Pause */}
      <button
        onClick={handlePlayPause}
        disabled={loading}
        className={`w-8 h-8 flex items-center justify-center rounded-full border transition shadow-sm ${
          isActive
            ? "bg-primary text-white border-primary"
            : "bg-white text-primary border-slate-300 hover:bg-slate-100"
        }`}
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : isActive ? (
          <Pause size={14} />
        ) : (
          <Play size={14} className="ml-0.5" />
        )}
      </button>

      {/* Stop Button */}
      {isCurrent && (
        <button
          onClick={handleStop}
          className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-full"
          title="Stop"
        >
          <Square size={12} />
        </button>
      )}

      {/* Download */}
      {audioUrl && (
        <a
          href={audioUrl}
          download="studify-tts.wav"
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full"
          onClick={(e) => e.stopPropagation()}
        >
          <Download size={14} />
        </a>
      )}

      {/* Error */}
      {error && (
        <VolumeX size={14} className="text-red-400 ml-1" />
      )}

      {/* Listen Label */}
      {!audioUrl && !loading && !error && (
        <span
          className="text-xs text-slate-400 cursor-pointer select-none"
          onClick={handlePlayPause}
        >
          Listen
        </span>
      )}
    </div>
  );
};
