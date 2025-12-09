import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { generateTTS, orchestrateRequest } from '../services/geminiService';
import { TestReport, TestResult } from '../types';
import { Play, CheckCircle, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { TTSPlayer } from '../components/TTSPlayer';

export const TestSuite: React.FC = () => {
  const { user, files } = useStore();
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<TestReport | null>(null);

  const runTests = async () => {
    setRunning(true);
    const results: TestResult[] = [];
    const logs: string[] = [];

    const log = (msg: string) => logs.push(`[${new Date().toISOString()}] ${msg}`);

    try {
      // 1. System Check
      log("Checking system configuration...");
      if (!user) throw new Error("User not initialized");
      results.push({ test: "System Init", status: "pass", details: { user: user.name } });

      // 2. TTS Schema & Performance Test
      log("Testing TTS generation...");
      const ttsStart = performance.now();
      const ttsResponse = await generateTTS("Testing system audio latency.");
      const ttsEnd = performance.now();
      
      if (ttsResponse.url) {
        results.push({ 
          test: "TTS Generation", 
          status: "pass", 
          details: { latencyMs: Math.round(ttsEnd - ttsStart), url: ttsResponse.url } 
        });
      } else {
        results.push({ 
          test: "TTS Generation", 
          status: "fail", 
          details: { response: "Missing audio URL from generate-tts" } 
        });
      }

      // 3. Agent Orchestration Test
      log("Testing Orchestrator Agent...");
      const agentStart = performance.now();
      const agentResponse = await orchestrateRequest("Hello, do I have any weak topics?", user, files, "");
      const agentEnd = performance.now();

      if (agentResponse.text) {
        results.push({ 
          test: "Orchestrator Agent", 
          status: "pass", 
          details: { latencyMs: Math.round(agentEnd - agentStart), textLength: agentResponse.text.length } 
        });
      } else {
        results.push({ test: "Orchestrator Agent", status: "fail", details: { error: "No response text" } });
      }

      // 4. File Context Check (Mock check if files exist)
      log(`Checking file context (${files.length} files)...`);
      if (files.length > 0) {
         results.push({ test: "File Context", status: "pass", details: { fileCount: files.length } });
      } else {
         results.push({ test: "File Context", status: "warn", details: { message: "No files uploaded to test RAG" } });
      }

      setReport({
        summary: `Test Run Complete. Passed: ${results.filter(r => r.status === 'pass').length}/${results.length}`,
        results,
        metrics: {
          total_duration_ms: performance.now() - ttsStart,
          agent_latency_ms: agentEnd - agentStart
        },
        logs_url_or_blob: JSON.stringify(logs, null, 2)
      });

    } catch (e: any) {
      log(`FATAL ERROR: ${e.message}`);
      setReport({
        summary: "Test Suite Crashed",
        results: [...results, { test: "Critical Failure", status: "fail", details: { error: e.message } }],
        metrics: {},
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800">System Diagnostics</h1>
        <button 
          onClick={runTests} 
          disabled={running}
          className="bg-primary text-white px-6 py-3 rounded-lg font-bold flex items-center hover:bg-sky-700 disabled:opacity-50"
        >
          {running ? <Loader2 className="animate-spin mr-2" /> : <Play className="mr-2" />}
          Run End-to-End Tests
        </button>
      </div>

      {!report && !running && (
        <div className="bg-white p-12 rounded-xl border border-dashed border-slate-300 text-center text-slate-500">
          Click "Run End-to-End Tests" to validate RAG, Agents, TTS, and Memory systems.
        </div>
      )}

      {report && (
        <div className="space-y-6">
          <div className={`p-4 rounded-lg border ${report.summary.includes('Crashed') ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'}`}>
            <h3 className="font-bold text-lg">{report.summary}</h3>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-4 font-semibold text-slate-600">Test Case</th>
                  <th className="p-4 font-semibold text-slate-600">Status</th>
                  <th className="p-4 font-semibold text-slate-600">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.results.map((res, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="p-4 font-medium text-slate-800">{res.test}</td>
                    <td className="p-4">
                      {res.status === 'pass' && <span className="inline-flex items-center text-green-600 px-2 py-1 bg-green-50 rounded text-xs font-bold uppercase"><CheckCircle size={14} className="mr-1"/> Pass</span>}
                      {res.status === 'fail' && <span className="inline-flex items-center text-red-600 px-2 py-1 bg-red-50 rounded text-xs font-bold uppercase"><XCircle size={14} className="mr-1"/> Fail</span>}
                      {res.status === 'warn' && <span className="inline-flex items-center text-orange-600 px-2 py-1 bg-orange-50 rounded text-xs font-bold uppercase"><AlertTriangle size={14} className="mr-1"/> Warn</span>}
                    </td>
                    <td className="p-4">
                      <pre className="text-xs text-slate-500 bg-slate-50 p-2 rounded max-w-md overflow-x-auto">
                        {JSON.stringify(res.details, null, 2)}
                      </pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-900 text-slate-300 p-6 rounded-xl font-mono text-xs overflow-x-auto">
            <h4 className="font-bold text-white mb-4 border-b border-slate-700 pb-2">System Logs</h4>
            <pre>{report.logs_url_or_blob}</pre>
          </div>
        </div>
      )}
    </div>
  );
};