import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppState, UserProfile, UploadedFile, Quiz, Flashcard, StudyPlanDay, EducationLevel } from '../types';

interface StoreContextType extends AppState {
  updateUser: (user: Partial<UserProfile>) => void;
  toggleAutoPlay: () => void;
  addFile: (file: UploadedFile) => void;
  addQuiz: (quiz: Quiz) => void;
  addFlashcards: (cards: Flashcard[]) => void;
  setPlan: (plan: StudyPlanDay[]) => void;
  completeOnboarding: () => void;
  resetData: () => void;
  recordPerformance: (topic: string, scorePercentage: number) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const INITIAL_STATE: AppState = {
  session: null,
  user: {
    name: 'Student',
    level: EducationLevel.CLASS_12,
    subjects: [],
    weakTopics: ['Physics', 'Integration'],
    strongTopics: ['Biology'],
    streak: 3,
    studyHoursPerDay: 2,
    autoPlayAudio: false,
    performanceHistory: {}
  },
  files: [],
  flashcards: [],
  quizzes: [],
  plans: [],
  onboardingComplete: false,
};

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(() => {
    const local = localStorage.getItem('studify_state');
    return local ? JSON.parse(local) : INITIAL_STATE;
  });

  useEffect(() => {
    localStorage.setItem('studify_state', JSON.stringify(state));
  }, [state]);

  const updateUser = (updates: Partial<UserProfile>) => {
    setState(prev => ({ ...prev, user: { ...prev.user!, ...updates } }));
  };
  
  const toggleAutoPlay = () => {
    setState(prev => ({
      ...prev,
      user: { ...prev.user!, autoPlayAudio: !prev.user!.autoPlayAudio }
    }));
  };

  const addFile = (file: UploadedFile) => {
    setState(prev => ({ ...prev, files: [...prev.files, file] }));
  };

  const addQuiz = (quiz: Quiz) => {
    setState(prev => ({ ...prev, quizzes: [quiz, ...prev.quizzes] }));
  };

  const addFlashcards = (cards: Flashcard[]) => {
    setState(prev => ({ ...prev, flashcards: [...prev.flashcards, ...cards] }));
  };

  const setPlan = (plan: StudyPlanDay[]) => {
    setState(prev => ({ ...prev, plans: plan }));
  };

  const completeOnboarding = () => {
    setState(prev => ({ ...prev, onboardingComplete: true }));
  };

  const resetData = () => {
    setState(INITIAL_STATE);
  };

  const recordPerformance = (topic: string, scorePercentage: number) => {
    setState(prev => {
      const user = prev.user!;
      const history = user.performanceHistory || {};
      const current = history[topic] || { totalScore: 0, attempts: 0 };
      
      const newTotal = current.totalScore + scorePercentage;
      const newAttempts = current.attempts + 1;
      const newAvg = newTotal / newAttempts;
      
      const newHistory = { ...history, [topic]: { totalScore: newTotal, attempts: newAttempts } };
      
      // Dynamic Memory Update Logic
      // < 60% = Weak
      // > 80% = Strong
      const weak = new Set(user.weakTopics);
      const strong = new Set(user.strongTopics);
      
      if (newAvg < 60) {
        weak.add(topic);
        strong.delete(topic);
      } else if (newAvg > 80) {
        strong.add(topic);
        weak.delete(topic);
      } else {
        // In between - remove from both lists (neutral)
        weak.delete(topic);
        strong.delete(topic);
      }
      
      return {
        ...prev,
        user: {
          ...user,
          performanceHistory: newHistory,
          weakTopics: Array.from(weak),
          strongTopics: Array.from(strong)
        }
      };
    });
  };

  return (
    <StoreContext.Provider value={{
      ...state,
      updateUser,
      toggleAutoPlay,
      addFile,
      addQuiz,
      addFlashcards,
      setPlan,
      completeOnboarding,
      resetData,
      recordPerformance
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within StoreProvider");
  return context;
};
