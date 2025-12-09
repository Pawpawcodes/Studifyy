import React, { useState } from 'react';
import { generateQuiz } from '../services/geminiService';
import { useStore } from '../context/StoreContext';
import { QuizQuestion } from '../types';
import { CheckCircle, Play, RefreshCw, Loader2, Brain } from 'lucide-react';
import { TTSPlayer } from '../components/TTSPlayer';
import { useTTS } from '../context/TTSProvider';

export const QuizPage: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const { addQuiz, recordPerformance } = useStore();
  const { play } = useTTS();

  const handleStartQuiz = async () => {
    if (!topic) return;
    setLoading(true);
    // Simulate difficulty tracking
    const quizData = await generateQuiz(topic, 'Medium');
    setQuestions(quizData);

    if (quizData && quizData.length > 0 && quizData[0].question) {
      // Read the first question aloud when quiz starts
      play(quizData[0].question);
    }

    setLoading(false);
    setCurrentQIndex(0);
    setScore(0);
    setShowResult(false);
    setSelectedOption(null);
  };

  const handleAnswer = (index: number) => {
    setSelectedOption(index);
    if (index === questions[currentQIndex].correctIndex) {
      setScore(s => s + 1);
    }
  };

  const nextQuestion = () => {
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex(prev => prev + 1);
      setSelectedOption(null);
    } else {
      setShowResult(true);
      const finalScore = selectedOption === questions[currentQIndex].correctIndex ? score + 1 : score;
      
      // Calculate percentage and update memory
      const percentage = (finalScore / questions.length) * 100;
      recordPerformance(topic, percentage);

      addQuiz({
        id: Date.now().toString(),
        topic,
        questions,
        score: finalScore,
        completedAt: new Date().toISOString()
      });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 size={48} className="animate-spin text-primary mb-4" />
        <h3 className="text-xl font-bold text-slate-700">Generating customized quiz...</h3>
        <p className="text-slate-500">Checking your weak areas and generating questions.</p>
      </div>
    );
  }

  if (showResult) {
    return (
      <div className="max-w-2xl mx-auto text-center py-10">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-10">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">Quiz Completed!</h2>
          <p className="text-slate-500 mb-8">You scored {score} out of {questions.length}</p>
          
          <div className="w-full bg-slate-100 rounded-full h-4 mb-8 overflow-hidden">
            <div 
              className="bg-green-500 h-full transition-all duration-1000" 
              style={{ width: `${(score / questions.length) * 100}%` }}
            ></div>
          </div>
          
          <p className="text-sm text-slate-500 mb-6">
            We've updated your learning profile based on these results.
          </p>

          <button 
            onClick={() => { setQuestions([]); setTopic(''); }}
            className="bg-primary text-white px-8 py-3 rounded-lg font-medium hover:bg-sky-700 transition-colors flex items-center mx-auto"
          >
            <RefreshCw size={20} className="mr-2" /> Start Another
          </button>
        </div>
      </div>
    );
  }

  if (questions.length > 0) {
    const question = questions[currentQIndex];
    const isAnswered = selectedOption !== null;

    return (
      <div className="max-w-3xl mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-700">{topic} Quiz</h2>
          <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-sm font-medium">
            {currentQIndex + 1} / {questions.length}
          </span>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <div className="flex justify-between items-start mb-6">
             <h3 className="text-xl font-medium text-slate-800 flex-1">{question.question}</h3>
             <TTSPlayer text={question.question} simple={true} />
          </div>
          
          <div className="space-y-3">
            {question.options.map((opt, idx) => {
              let btnClass = "w-full text-left p-4 rounded-lg border transition-all ";
              if (isAnswered) {
                if (idx === question.correctIndex) btnClass += "bg-green-50 border-green-500 text-green-700";
                else if (idx === selectedOption) btnClass += "bg-red-50 border-red-500 text-red-700";
                else btnClass += "bg-slate-50 border-slate-200 opacity-60";
              } else {
                btnClass += "bg-white border-slate-200 hover:bg-slate-50 hover:border-primary";
              }

              return (
                <button 
                  key={idx}
                  disabled={isAnswered}
                  onClick={() => handleAnswer(idx)}
                  className={btnClass}
                >
                  <div className="flex items-center">
                    <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs mr-3 font-bold opacity-70">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    {opt}
                  </div>
                </button>
              );
            })}
          </div>

          {isAnswered && (
            <div className="mt-6 p-4 bg-blue-50 text-blue-800 rounded-lg text-sm relative">
              <strong>Explanation:</strong> {question.explanation}
              <div className="absolute right-2 top-2">
                 <TTSPlayer text={question.explanation} simple={true} />
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-end">
            <button 
              disabled={!isAnswered}
              onClick={nextQuestion}
              className="bg-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-sky-700 disabled:opacity-50 transition-colors"
            >
              {currentQIndex === questions.length - 1 ? "Finish" : "Next Question"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Initial State
  return (
    <div className="max-w-2xl mx-auto py-10">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
        <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Brain size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Generate a Quiz</h2>
        <p className="text-slate-500 mb-8">Test your knowledge. We'll adapt the difficulty based on your performance.</p>

        <div className="flex flex-col space-y-4">
           <input 
             type="text" 
             placeholder="Enter topic (e.g. Organic Chemistry)" 
             className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:outline-none"
             value={topic}
             onChange={(e) => setTopic(e.target.value)}
           />
           <button 
             onClick={handleStartQuiz}
             disabled={!topic}
             className="w-full bg-primary text-white py-4 rounded-lg font-bold text-lg hover:bg-sky-700 transition-colors flex items-center justify-center disabled:opacity-70"
           >
             <Play size={20} className="mr-2 fill-current" /> Start Quiz
           </button>
        </div>
      </div>
    </div>
  );
};