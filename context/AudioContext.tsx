import React, { createContext, useContext, useRef, useState, useEffect } from 'react';

interface AudioContextType {
  play: (id: string, url: string) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  currentId: string | null;
  isPlaying: boolean;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // Create single audio instance
    const audio = new Audio();
    audioRef.current = audio;

    const handleEnded = () => {
      setCurrentId(null);
      setIsPlaying(false);
    };

    const handlePause = () => {
      // Only update state if it was actually playing the current track
      // This helps when manually pausing vs system interruptions
      setIsPlaying(false);
    };
    
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    
    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.pause();
      audio.src = '';
    };
  }, []);

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setCurrentId(null);
      setIsPlaying(false);
    }
  };

  const play = async (id: string, url: string) => {
    if (!audioRef.current) return;

    // If same ID, we might be resuming
    if (currentId === id) {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (e) {
        console.error("Playback resume failed", e);
      }
      return;
    }

    // Different ID: Stop previous, start new
    stop(); 
    
    setCurrentId(id);
    audioRef.current.src = url;
    
    try {
      await audioRef.current.play();
      setIsPlaying(true);
    } catch (e) {
      console.error("Playback failed", e);
      setCurrentId(null);
      setIsPlaying(false);
    }
  };

  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const resume = () => {
    if (audioRef.current && currentId) {
      audioRef.current.play().catch(e => console.error(e));
      setIsPlaying(true);
    }
  };

  return (
    <AudioContext.Provider value={{ play, pause, resume, stop, currentId, isPlaying }}>
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) throw new Error("useAudio must be used within AudioProvider");
  return context;
};