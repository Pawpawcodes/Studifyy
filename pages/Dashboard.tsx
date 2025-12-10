import React from "react";
import { useStore } from "../context/StoreContext";
import {
  ArrowRight,
  Flame,
  Target,
  Clock,
  BookOpen,
  HelpCircle,
  Brain,
  FileText,
} from "lucide-react";
import { Link } from "react-router-dom";

export const Dashboard: React.FC = () => {
  const { user, quizzes, flashcards } = useStore();

  const ActionCard = ({ title, icon: Icon, color, to, desc }: any) => (
    <Link
      to={to}
      className="group bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all"
    >
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${color}`}
      >
        <Icon size={24} className="text-white" />
      </div>
      <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-primary transition-colors">
        {title}
      </h3>
      <p className="text-slate-500 text-sm mb-4">{desc}</p>
      <div className="flex items-center text-primary text-sm font-medium">
        <span>Start</span>
        <ArrowRight
          size={16}
          className="ml-1 group-hover:translate-x-1 transition-transform"
        />
      </div>
    </Link>
  );

  return (
    <div className="space-y-8 pb-10">
      {/* Welcome & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 bg-gradient-to-r from-primary to-blue-500 rounded-2xl p-6 text-white shadow-lg">
          <h2 className="text-2xl font-bold mb-2">
            Welcome back, {user?.name}!
          </h2>
          <p className="opacity-90 mb-6">
            You're on a roll. Ready to crush your {user?.level} goals?
          </p>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2 bg-white/20 px-3 py-1.5 rounded-lg backdrop-blur-sm">
              <Flame className="text-yellow-300" size={20} />
              <span className="font-bold">{user?.streak} Day Streak</span>
            </div>
            <div className="flex items-center space-x-2 bg-white/20 px-3 py-1.5 rounded-lg backdrop-blur-sm">
              <Target className="text-green-300" size={20} />
              <span className="font-bold">{quizzes.length} Quizzes Done</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 font-medium">Flashcards</span>
            <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
              <FileText size={20} />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-800">
            {flashcards.length}
          </div>
          <p className="text-xs text-slate-400">Cards created</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 font-medium">Study Goal</span>
            <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
              <Clock size={20} />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-800">
            {user?.studyHoursPerDay}h
          </div>
          <p className="text-xs text-slate-400">Daily Target</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-xl font-bold text-slate-800 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <ActionCard
            title="Explain Topic"
            desc="Deep dive into any concept with AI"
            icon={BookOpen}
            color="bg-blue-500"
            to="/explain"
          />
          <ActionCard
            title="Ask a Doubt"
            desc="Upload notes or ask questions"
            icon={HelpCircle}
            color="bg-green-500"
            to="/doubt"
          />
          <ActionCard
            title="Take Quiz"
            desc="Test your knowledge on weak topics"
            icon={Brain}
            color="bg-purple-500"
            to="/quiz"
          />
          <ActionCard
            title="Revise Cards"
            desc="Spaced repetition for better recall"
            icon={FileText}
            color="bg-orange-500"
            to="/flashcards"
          />
        </div>
      </div>

      {/* Recent Activity / Weak Topics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">
            Focus Areas (Weak Topics)
          </h3>
          <div className="flex flex-wrap gap-2">
            {user?.weakTopics.map((topic, i) => (
              <span
                key={i}
                className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-sm font-medium border border-red-100"
              >
                {topic}
              </span>
            ))}
            <button className="px-3 py-1 text-slate-400 text-sm hover:text-primary">
              + Add more
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">Recent Activity</h3>
          {quizzes.length === 0 ? (
            <p className="text-slate-400 text-sm">No recent activity yet.</p>
          ) : (
            <div className="space-y-3">
              {quizzes.slice(0, 3).map((q, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-slate-700">
                    Completed Quiz: <b>{q.topic}</b>
                  </span>
                  <span className="text-slate-400">
                    {q.completedAt
                      ? new Date(q.completedAt).toLocaleDateString()
                      : "Just now"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
