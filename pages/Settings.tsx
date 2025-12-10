import React, { useState } from "react";
import { useStore } from "../context/StoreContext";
import { EducationLevel, Subject } from "../types";
import { Check, Volume2, Save, User } from "lucide-react";

export const SettingsPage: React.FC = () => {
  const { user, updateUser, toggleAutoPlay } = useStore();
  const [name, setName] = useState(user?.name || "");
  const [saved, setSaved] = useState(false);

  const handleSaveName = () => {
    updateUser({ name });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h2 className="text-2xl font-bold text-slate-800 mb-8">
        Settings & Profile
      </h2>

      <div className="space-y-6">
        {/* Profile Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center">
            <User size={20} className="mr-2" /> Profile
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">
                Display Name
              </label>
              <div className="flex gap-2">
                <input
                  className="flex-1 border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary/50 outline-none"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <button
                  onClick={handleSaveName}
                  className="bg-primary text-white px-4 py-2 rounded-lg font-medium flex items-center"
                >
                  {saved ? <Check size={18} /> : <Save size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">
                Education Level
              </label>
              <select
                className="w-full border border-slate-300 rounded-lg px-4 py-2 outline-none"
                value={user.level}
                onChange={(e) =>
                  updateUser({ level: e.target.value as EducationLevel })
                }
              >
                {Object.values(EducationLevel).map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Preferences Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center">
            <Volume2 size={20} className="mr-2" /> Preferences
          </h3>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-slate-800">
                Auto-Play Text-to-Speech
              </p>
              <p className="text-sm text-slate-500">
                Automatically read aloud explanations and chat responses.
              </p>
            </div>
            <button
              onClick={toggleAutoPlay}
              className={`w-12 h-6 rounded-full transition-colors relative ${user.autoPlayAudio ? "bg-primary" : "bg-slate-300"}`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${user.autoPlayAudio ? "left-7" : "left-1"}`}
              />
            </button>
          </div>
        </div>

        {/* Academic Info */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 opacity-70">
          <h3 className="text-lg font-bold text-slate-700 mb-4">
            Academic Focus
          </h3>
          <div className="flex flex-wrap gap-2">
            {user.subjects.map((s) => (
              <span
                key={s}
                className="px-3 py-1 bg-slate-100 rounded-full text-sm text-slate-600"
              >
                {s}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-4">
            To change subjects, please reset the app.
          </p>
        </div>
      </div>
    </div>
  );
};
