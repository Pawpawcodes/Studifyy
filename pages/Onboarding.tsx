import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { EducationLevel, Subject } from '../types';
import { useNavigate } from 'react-router-dom'; // Actually using HashRouter from parent
import { Check } from 'lucide-react';

export const Onboarding: React.FC = () => {
  const { updateUser, completeOnboarding } = useStore();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [level, setLevel] = useState<EducationLevel>(EducationLevel.CLASS_12);
  const [selectedSubjects, setSelectedSubjects] = useState<Subject[]>([]);
  
  const handleFinish = () => {
    updateUser({
      name,
      level,
      subjects: selectedSubjects,
    });
    completeOnboarding();
  };

  const toggleSubject = (s: Subject) => {
    if (selectedSubjects.includes(s)) {
      setSelectedSubjects(prev => prev.filter(i => i !== s));
    } else {
      setSelectedSubjects(prev => [...prev, s]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-xl border border-slate-200 p-8">
        {/* Progress */}
        <div className="flex space-x-2 mb-8">
          {[1, 2, 3].map(i => (
            <div key={i} className={`h-1 flex-1 rounded-full ${step >= i ? 'bg-primary' : 'bg-slate-200'}`} />
          ))}
        </div>

        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Let's get to know you</h2>
            <p className="text-slate-500 mb-6">What should we call you?</p>
            <input 
              type="text"
              className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/50 outline-none"
              placeholder="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button 
              onClick={() => setStep(2)}
              disabled={!name}
              className="mt-6 w-full bg-primary text-white py-3 rounded-lg font-bold hover:bg-sky-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Current Level</h2>
            <p className="text-slate-500 mb-6">This helps us personalize explanations.</p>
            <div className="space-y-3">
              {Object.values(EducationLevel).map((l) => (
                <button
                  key={l}
                  onClick={() => setLevel(l)}
                  className={`w-full text-left px-4 py-3 rounded-lg border flex justify-between items-center ${
                    level === l ? 'border-primary bg-sky-50 text-primary font-medium' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>{l}</span>
                  {level === l && <Check size={18} />}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setStep(3)}
              className="mt-6 w-full bg-primary text-white py-3 rounded-lg font-bold hover:bg-sky-700"
            >
              Next
            </button>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Your Subjects</h2>
            <p className="text-slate-500 mb-6">Select the subjects you're studying.</p>
            <div className="flex flex-wrap gap-2 mb-6">
              {Object.values(Subject).map((s) => (
                <button
                  key={s}
                  onClick={() => toggleSubject(s)}
                  className={`px-3 py-2 rounded-full text-sm border transition-colors ${
                    selectedSubjects.includes(s) 
                      ? 'bg-secondary text-white border-secondary' 
                      : 'bg-white text-slate-600 border-slate-200 hover:border-secondary'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <button 
              onClick={handleFinish}
              disabled={selectedSubjects.length === 0}
              className="w-full bg-primary text-white py-3 rounded-lg font-bold hover:bg-sky-700 disabled:opacity-50"
            >
              Start Learning
            </button>
          </div>
        )}
      </div>
    </div>
  );
};