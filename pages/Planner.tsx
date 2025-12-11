import React, { useState, useEffect } from "react";
import { useStore } from "../context/StoreContext";
import { generateStudyPlan } from "../services/geminiService";
import { CheckSquare, RefreshCw } from "lucide-react";
import { TTSPlayer } from "../components/TTSPlayer";

export const PlannerPage: React.FC = () => {
  const { user, plans, setPlan } = useStore();
  const [generating, setGenerating] = useState(false);

  const handleCreatePlan = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const focus = user.weakTopics[0] || "General Revision";
      const newPlan = await generateStudyPlan(user, focus);
      setPlan(newPlan);
    } catch (e: any) {
      if (e?.message === "QUOTA_EXCEEDED") {
        alert(
          "Free tier quota for AI generation is exceeded right now. Please try again later or reduce requests."
        );
      } else {
        console.error(e);
        alert("Unable to generate study plan. Please try again later.");
      }
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (plans.length === 0) {
      handleCreatePlan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const planSummary = plans
    .map(
      (p) =>
        `On ${p.day}, focus on ${p.focusTopic}. Tasks: ${p.tasks.join(", ")}.`,
    )
    .join(" ");

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            Weekly Study Plan
          </h2>
          <p className="text-slate-500">
            Optimized for {user?.level}, focusing on your weak areas.
          </p>
        </div>
        <div className="flex space-x-3">
          {plans.length > 0 && (
            <TTSPlayer text={`Here is your study plan. ${planSummary}`} />
          )}
          <button
            onClick={handleCreatePlan}
            disabled={generating}
            className="flex items-center space-x-2 text-primary hover:bg-sky-50 px-4 py-2 rounded-lg transition-colors"
          >
            <RefreshCw size={18} className={generating ? "animate-spin" : ""} />
            <span>Regenerate</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {generating ? (
          <div className="col-span-full py-20 text-center text-slate-400">
            Building your schedule...
          </div>
        ) : (
          plans.map((day, idx) => (
            <div
              key={idx}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-5"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-50">
                <span className="font-bold text-slate-700">{day.day}</span>
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                  {day.focusTopic}
                </span>
              </div>
              <ul className="space-y-3">
                {day.tasks.map((task, tIdx) => (
                  <li
                    key={tIdx}
                    className="flex items-start space-x-3 text-sm text-slate-600"
                  >
                    <CheckSquare
                      size={16}
                      className="mt-0.5 text-slate-300 flex-shrink-0"
                    />
                    <span>{task}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
