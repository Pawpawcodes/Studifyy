import React, { useState } from 'react';
import { explainTopic } from '../services/geminiService';
import { useStore } from '../context/StoreContext';
import { Send, Loader2, Link as LinkIcon, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { GroundingSource } from '../types';
import { TTSPlayer } from '../components/TTSPlayer';

export const ExplainPage: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [explanation, setExplanation] = useState<string | null>(null);
  const [sources, setSources] = useState<GroundingSource[]>([]);
  const [loading, setLoading] = useState(false);
  const { user, files } = useStore();

  const handleExplain = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setExplanation(null);
    setSources([]);

    // Pass the full user object for personalization based on weak/strong topics
    const result = await explainTopic(topic, user!, files);
    setExplanation(result.text);
    setSources(result.sources || []);
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Topic Explainer</h2>
      
      <div className="flex-1 overflow-y-auto bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-4">
        {!explanation && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <div className="bg-slate-100 p-4 rounded-full mb-4">
               <Loader2 size={32} className="animate-spin text-slate-300" />
            </div>
            <p>Enter a topic below to get a personalized explanation.</p>
            <p className="text-sm mt-2">I'll check your notes first, then search the web if needed.</p>
          </div>
        )}

        {loading && (
          <div className="space-y-4 animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            <div className="h-4 bg-slate-200 rounded w-full"></div>
            <div className="h-4 bg-slate-200 rounded w-5/6"></div>
            <div className="h-32 bg-slate-100 rounded w-full mt-6"></div>
          </div>
        )}

        {explanation && (
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
               <h3 className="font-bold text-slate-700">AI Explanation</h3>
               <TTSPlayer text={explanation} autoPlay={true} />
            </div>
            
            <div className="prose prose-slate max-w-none">
              <ReactMarkdown>{explanation}</ReactMarkdown>
            </div>
            
            {sources.length > 0 && (
              <div className="mt-8 pt-6 border-t border-slate-100">
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center">
                  <LinkIcon size={14} className="mr-2" /> Sources
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {sources.map((source, idx) => (
                    <a 
                      key={idx} 
                      href={source.uri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors text-sm text-blue-600 truncate group border border-slate-100"
                    >
                      <ExternalLink size={14} className="mr-2 flex-shrink-0 opacity-50 group-hover:opacity-100" />
                      <span className="truncate">{source.title}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex space-x-2">
        <input 
          type="text" 
          placeholder="e.g. Newton's Second Law, Photosynthesis..." 
          className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleExplain()}
        />
        <button 
          onClick={handleExplain}
          disabled={loading || !topic}
          className="bg-primary hover:bg-sky-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center"
        >
          {loading ? <Loader2 className="animate-spin" /> : <Send size={20} />}
          <span className="ml-2 hidden sm:inline">Explain</span>
        </button>
      </div>
    </div>
  );
};