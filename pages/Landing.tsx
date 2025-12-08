import React from 'react';
import { ArrowRight, Brain, Zap, Layers } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { TTSPlayer } from '../components/TTSPlayer';

export const LandingPage: React.FC = () => {
  const { completeOnboarding } = useStore();

  // For this demo, we skip auth and go straight to onboarding
  const handleGetStarted = () => {
    // In a real app, this would route to /signup
    // Here we just trigger the state to show Onboarding inside App.tsx
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex items-center space-x-2">
          <img
            src="/studify-logo.png"
            alt="Studify logo"
            className="w-10 h-10 object-contain"
          />
          <span className="text-2xl font-bold text-slate-900 tracking-tight">Studify</span>
        </div>
        <button onClick={handleGetStarted} className="text-sm font-semibold text-slate-600 hover:text-primary">
          Log In
        </button>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center text-center px-4">
        <div className="bg-sky-50 text-sky-700 px-4 py-1.5 rounded-full text-sm font-bold mb-6 flex items-center space-x-2">
          <span>v2.0 with Gemini 2.5 is here</span>
          <TTSPlayer text="Welcome to Studify version 2.0. Not just smart, multi-smart." simple={true} />
        </div>
        <h1 className="text-5xl md:text-7xl font-bold text-slate-900 mb-6 tracking-tight">
          Not just smart, <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
            multi-smart.
          </span>
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mb-10 leading-relaxed">
          The all-in-one AI tutor that explains topics, solves doubts from your PDFs, generates quizzes, and plans your study schedule.
        </p>
        
        <button 
          onClick={handleGetStarted}
          className="group bg-primary text-white px-8 py-4 rounded-full text-lg font-bold shadow-lg hover:shadow-xl hover:bg-sky-600 transition-all flex items-center"
        >
          Get Started
          <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20 max-w-5xl w-full text-left">
          <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 mb-4">
              <Brain size={24} />
            </div>
            <h3 className="font-bold text-lg mb-2">Concept Explainer</h3>
            <p className="text-slate-500">Understand complex topics with simple, personalized analogies adapted to your level.</p>
          </div>
          <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600 mb-4">
              <Zap size={24} />
            </div>
            <h3 className="font-bold text-lg mb-2">Instant Doubt Solving</h3>
            <p className="text-slate-500">Upload a photo or PDF of your textbook and get instant answers sourced from your material.</p>
          </div>
          <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 mb-4">
              <Layers size={24} />
            </div>
            <h3 className="font-bold text-lg mb-2">Smart Quizzes</h3>
            <p className="text-slate-500">Auto-generated quizzes that adapt to your performance to strengthen weak areas.</p>
          </div>
        </div>
      </main>

      <footer className="py-8 text-center text-slate-400 text-sm">
        &copy; 2025 Studify AI. Powered by Google Gemini.
      </footer>
    </div>
  );
};