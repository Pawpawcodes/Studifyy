import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, ExternalLink, Mic } from "lucide-react";
import { orchestrateRequest } from "../services/geminiService";
import { useStore } from "../context/StoreContext";
import ReactMarkdown from "react-markdown";
import { GroundingSource } from "../types";
import { TTSPlayer } from "./TTSPlayer";

interface Message {
  role: "user" | "ai";
  content: string;
  sources?: GroundingSource[];
}

export const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      content:
        "Hi! I'm Studify AI. I can see your uploaded files and help you study. Ask me anything!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { files, user } = useStore();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setInput("");
    setLoading(true);

    // Provide history to allow conversational context (memory)
    const history = messages.map((m) => `${m.role}: ${m.content}`).join("\n");

    const response = await orchestrateRequest(userMsg, user, files, history);

    setMessages((prev) => [
      ...prev,
      {
        role: "ai",
        content: response.text,
        sources: response.sources,
      },
    ]);
    setLoading(false);
  };

  const handleMicClick = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Your browser does not support voice input. Please try Chrome.");
      return;
    }

    if (isRecording) {
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsRecording(false);
    };
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => (prev ? prev + " " : "") + transcript);
    };

    recognition.start();
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-primary hover:bg-sky-700 text-white p-4 rounded-full shadow-lg transition-all transform hover:scale-105"
        >
          <MessageCircle size={28} />
        </button>
      )}

      {isOpen && (
        <div className="bg-white w-80 md:w-96 h-[500px] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-primary text-white p-4 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Bot size={20} />
              <span className="font-bold">Studify AI</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 p-1 rounded"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50"
            ref={scrollRef}
          >
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`flex items-start max-w-[95%] gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  {/* Avatar for AI */}
                  {msg.role === "ai" && (
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0 mt-1">
                      <Bot size={14} />
                    </div>
                  )}

                  <div
                    className={`p-3 rounded-2xl text-sm shadow-sm ${
                      msg.role === "user"
                        ? "bg-primary text-white rounded-br-none"
                        : "bg-white border border-slate-200 text-slate-700 rounded-bl-none prose prose-sm"
                    }`}
                  >
                    {msg.role === "ai" ? (
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    ) : (
                      msg.content
                    )}
                  </div>

                  {/* Listen Button for AI messages */}
                  {msg.role === "ai" && (
                    <TTSPlayer
                      text={msg.content}
                      simple={true}
                      className="mt-1"
                    />
                  )}
                </div>

                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-1 ml-9 text-xs text-slate-400 flex flex-wrap gap-1 max-w-[90%]">
                    {msg.sources.slice(0, 2).map((s, i) => (
                      <a
                        key={i}
                        href={s.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center hover:text-primary hover:underline bg-slate-100 px-1.5 py-0.5 rounded"
                      >
                        {s.title.substring(0, 15)}...{" "}
                        <ExternalLink size={10} className="ml-1" />
                      </a>
                    ))}
                    {msg.sources.length > 2 && (
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded">
                        +{msg.sources.length - 2} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex justify-start ml-8">
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex space-x-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 bg-white border-t border-slate-100 flex items-center space-x-2">
            <input
              type="text"
              className="flex-1 border border-slate-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-primary"
              placeholder={isRecording ? "Listening..." : "Ask anything..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />

            <button
              onClick={handleMicClick}
              disabled={loading || isRecording}
              className={`p-2 rounded-full transition-all ${
                isRecording
                  ? "bg-red-500 text-white animate-pulse"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
              title="Speak"
            >
              <Mic size={18} />
            </button>

            <button
              onClick={handleSend}
              disabled={loading}
              className="bg-secondary text-white p-2 rounded-full hover:bg-green-700 disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
