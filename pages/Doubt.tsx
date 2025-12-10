import React, { useState, useRef } from "react";
import {
  Upload,
  FileText,
  Image as ImageIcon,
  Send,
  Loader2,
  Search,
  ExternalLink,
  Link as LinkIcon,
} from "lucide-react";
import { useStore } from "../context/StoreContext";
import { useAuth } from "../context/AuthContext";
import { uploadFileToStorage } from "../services/supabaseService";
import { UploadedFile, GroundingSource } from "../types";
import ReactMarkdown from "react-markdown";
import { solveDoubt } from "../services/geminiService";
import { TTSPlayer } from "../components/TTSPlayer";
import { useTTS } from "../context/TTSProvider";

export const DoubtPage: React.FC = () => {
  const { addFile, files } = useStore();
  const { session } = useAuth();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<GroundingSource[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSolving, setIsSolving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { play } = useTTS();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && session?.user) {
      setIsUploading(true);
      const file = e.target.files[0];

      // Upload to Supabase Storage
      const uploadedFile = await uploadFileToStorage(file, session.user.id);

      if (uploadedFile) {
        // Also read base64 for local immediate use (for now)
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64Data = event.target?.result as string;
          uploadedFile.data = base64Data.split(",")[1]; // Add data for Gemini
          addFile(uploadedFile);
        };
        reader.readAsDataURL(file);
      } else {
        alert("Upload failed. Please try again.");
      }

      setIsUploading(false);
    }
  };

  const handleSolve = async () => {
    if (!question) return;
    setIsSolving(true);
    setAnswer(null);
    setSources([]);

    // We pass all files to the agent
    const response = await solveDoubt(question, files);

    setAnswer(response.text);
    setSources(response.sources || []);

    if (response.text) {
      play(response.text);
    }

    setIsSolving(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-8rem)]">
      {/* Left Panel: Files */}
      <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-700">Study Material</h3>
          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
            {files.length} files
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {files.map((f) => (
            <div
              key={f.id}
              className="flex items-center p-3 border border-slate-100 rounded-lg hover:bg-slate-50"
            >
              <div className="bg-blue-100 p-2 rounded text-blue-600 mr-3">
                {f.type === "image" ? (
                  <ImageIcon size={16} />
                ) : (
                  <FileText size={16} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{f.name}</p>
                <p className="text-xs text-slate-400">
                  {new Date(f.uploadDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}

          {files.length === 0 && (
            <div className="text-center py-10 text-slate-400">
              <Upload size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No files uploaded yet.</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*,application/pdf"
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-primary hover:text-primary transition-colors flex items-center justify-center font-medium"
          >
            {isUploading ? (
              <>
                <Loader2 size={18} className="animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Upload size={18} className="mr-2" />
                Upload PDF / Image
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right Panel: Doubt Solver */}
      <div className="lg:col-span-2 flex flex-col h-full space-y-4">
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-6 overflow-y-auto">
          {!answer && !isSolving && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
              <Search size={48} className="mb-4 text-secondary" />
              <h3 className="text-lg font-bold">Ask a Doubt</h3>
              <p>Upload a tricky page and ask questions about it.</p>
              <p className="text-sm text-slate-500 mt-2">
                I can read diagrams, handwriting, and text!
              </p>
            </div>
          )}

          {isSolving && (
            <div className="space-y-4 animate-pulse p-4">
              <div className="h-4 bg-slate-200 rounded w-1/3"></div>
              <div className="h-20 bg-slate-100 rounded w-full"></div>
              <div className="h-4 bg-slate-200 rounded w-2/3"></div>
            </div>
          )}

          {answer && (
            <div className="prose prose-slate max-w-none relative">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wide">
                  AI Solution
                </h4>
                <TTSPlayer text={answer} />
              </div>
              <ReactMarkdown>{answer}</ReactMarkdown>

              {sources.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center">
                    <LinkIcon size={12} className="mr-1" /> External Sources
                  </h4>
                  <ul className="space-y-1">
                    {sources.map((s, i) => (
                      <li key={i}>
                        <a
                          href={s.uri}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-500 hover:underline flex items-center"
                        >
                          {s.title} <ExternalLink size={10} className="ml-1" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex items-center space-x-2">
          <input
            className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-slate-800 placeholder-slate-400"
            placeholder="Type your question..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSolve()}
          />
          <button
            onClick={handleSolve}
            disabled={isSolving || !question}
            className="bg-secondary hover:bg-green-700 text-white p-3 rounded-lg shadow-sm transition-all"
          >
            {isSolving ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
