import React, { useState } from "react";
import { useStore } from "../context/StoreContext";
import { generateFlashcards } from "../services/geminiService";
import { RefreshCcw, ThumbsUp, ThumbsDown, Plus } from "lucide-react";
import { TTSPlayer } from "../components/TTSPlayer";
import { useTTS } from "../context/TTSProvider";

export const FlashcardsPage: React.FC = () => {
  const { flashcards, addFlashcards, recordPerformance } = useStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [topicInput, setTopicInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const { play } = useTTS();

  const activeDeck = flashcards.length > 0 ? flashcards : [];

  const handleGenerate = async () => {
    if (!topicInput) return;
    setGenerating(true);
    try {
      let newCards = await generateFlashcards(topicInput);
      if (!newCards || newCards.length === 0) {
        // Local fallback deck if API returns nothing
        newCards = Array.from({ length: 5 }).map((_, i) => ({
          id: `fc-${Date.now()}-${i}`,
          front: `${topicInput}: Question ${i + 1}`,
          back: `${topicInput}: Answer ${i + 1}`,
          topic: topicInput,
          nextReview: new Date().toISOString(),
          difficulty: 0,
        }));
      }
      addFlashcards(newCards);

      if (newCards && newCards.length > 0 && newCards[0].front) {
        // Read the first generated question aloud
        play(newCards[0].front);
      }

      setTopicInput("");
    } catch (e: any) {
      if (e?.message === "QUOTA_EXCEEDED") {
        alert(
          "Free tier quota for AI generation is exceeded right now. Please try again later or reduce requests."
        );
      } else {
        console.error(e);
        alert("Unable to generate flashcards. Please try again later.");
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleNext = (score: number, topic: string) => {
    // Record feedback: 0 for Hard, 100 for Easy
    recordPerformance(topic, score);

    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % activeDeck.length);
    }, 200);
  };

  if (activeDeck.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <div className="bg-orange-100 p-6 rounded-full mb-6 text-orange-600">
          <RefreshCcw size={48} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">No Flashcards Yet</h2>
        <p className="text-slate-500 mb-6 max-w-md">
          Enter a topic to generate your first deck using AI.
        </p>

        <div className="flex w-full max-w-md space-x-2">
          <input
            className="flex-1 border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary/50 outline-none"
            placeholder="Topic (e.g. Calculus)"
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
          />
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-primary text-white px-4 py-2 rounded-lg font-medium"
          >
            {generating ? "..." : <Plus />}
          </button>
        </div>
      </div>
    );
  }

  const currentCard = activeDeck[currentIndex];

  return (
    <div className="max-w-xl mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800">
          Reviewing {activeDeck.length} cards
        </h2>
        <button
          onClick={() => setIsFlipped(!isFlipped)}
          className="text-primary text-sm font-medium hover:underline"
        >
          {isFlipped ? "Show Question" : "Show Answer"}
        </button>
      </div>

      <div
        className="relative h-80 w-full cursor-pointer perspective-1000 group"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div
          className={`relative w-full h-full duration-500 transform transition-transform preserve-3d ${isFlipped ? "rotate-y-180" : ""}`}
        >
          {/* Front */}
          <div className="absolute w-full h-full backface-hidden bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col items-center justify-center p-8 text-center">
            <div
              className="absolute top-4 right-4"
              onClick={(e) => e.stopPropagation()}
            >
              <TTSPlayer text={currentCard.front} simple={true} />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
              Question
            </span>
            <h3 className="text-2xl font-medium text-slate-800">
              {currentCard.front}
            </h3>
            <p className="mt-4 text-sm text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
              Click to flip
            </p>
          </div>

          {/* Back */}
          <div className="absolute w-full h-full backface-hidden bg-slate-800 text-white rotate-y-180 rounded-2xl shadow-sm flex flex-col items-center justify-center p-8 text-center">
            <div
              className="absolute top-4 right-4"
              onClick={(e) => e.stopPropagation()}
            >
              <TTSPlayer
                text={currentCard.back}
                simple={true}
                className="text-white hover:text-white"
              />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
              Answer
            </span>
            <p className="text-lg leading-relaxed">{currentCard.back}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-center space-x-6 mt-8">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleNext(0, currentCard.topic);
          }}
          className="flex items-center space-x-2 bg-red-100 text-red-600 px-6 py-3 rounded-full hover:bg-red-200 transition-colors"
        >
          <ThumbsDown size={20} />
          <span>Hard</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleNext(100, currentCard.topic);
          }}
          className="flex items-center space-x-2 bg-green-100 text-green-600 px-6 py-3 rounded-full hover:bg-green-200 transition-colors"
        >
          <ThumbsUp size={20} />
          <span>Easy</span>
        </button>
      </div>

      <div className="mt-10 pt-6 border-t border-slate-200">
        <h4 className="text-sm font-bold text-slate-500 mb-2">
          Add more cards
        </h4>
        <div className="flex space-x-2">
          <input
            className="flex-1 border border-slate-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
            placeholder="Topic..."
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
          />
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Generate
          </button>
        </div>
      </div>
    </div>
  );
};
