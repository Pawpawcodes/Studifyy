import React from "react";
import { useStore } from "../context/StoreContext";
import {
  LayoutDashboard,
  BookOpen,
  BrainCircuit,
  FileText,
  Calendar,
  LogOut,
  Menu,
  MessageSquare,
  Upload,
  Settings,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom"; // Using react-router-dom hash router

export const Layout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, resetData } = useStore();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const NavItem = ({
    to,
    icon: Icon,
    label,
  }: {
    to: string;
    icon: any;
    label: string;
  }) => {
    const isActive = location.pathname === to;
    return (
      <Link
        to={to}
        onClick={() => setMobileMenuOpen(false)}
        className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
          isActive
            ? "bg-primary/10 text-primary border-r-4 border-primary"
            : "text-slate-600 hover:bg-slate-100"
        }`}
      >
        <Icon size={20} />
        <span className="font-medium">{label}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 fixed h-full z-20">
        <div className="p-6 flex items-center space-x-3">
          <img
            src="/studify-logo.png"
            alt="Studify logo"
            className="w-10 h-10 rounded-lg object-contain bg-transparent"
          />
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              Studify
            </h1>
            <p className="text-xs text-slate-500">Multi-Agent Tutor</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
          <NavItem to="/explain" icon={BookOpen} label="Explain Topic" />
          <NavItem to="/doubt" icon={MessageSquare} label="Ask a Doubt" />
          <NavItem to="/quiz" icon={BrainCircuit} label="Take Quiz" />
          <NavItem to="/flashcards" icon={FileText} label="Flashcards" />
          <NavItem to="/plan" icon={Calendar} label="Study Plan" />
          <NavItem to="/uploads" icon={Upload} label="Uploads" />
        </nav>

        <div className="p-4 border-t border-slate-200 space-y-2">
          <Link
            to="/settings"
            className="flex items-center space-x-3 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Settings size={20} />
            <span className="font-medium">Settings</span>
          </Link>

          <div className="flex items-center space-x-3 pt-2">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
              {user?.name.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">{user?.name}</p>
              <p className="text-xs text-slate-500">{user?.level}</p>
            </div>
          </div>
          <button
            onClick={resetData}
            className="flex items-center space-x-2 text-slate-500 hover:text-red-500 text-sm w-full pl-1 pt-1"
          >
            <LogOut size={16} />
            <span>Reset App</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-white border-b border-slate-200 z-30 px-4 py-3 flex justify-between items-center">
        <span className="font-bold text-xl text-primary">Studify</span>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          <Menu size={24} />
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-white z-40 pt-16 px-4 space-y-2 md:hidden">
          <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
          <NavItem to="/explain" icon={BookOpen} label="Explain Topic" />
          <NavItem to="/doubt" icon={MessageSquare} label="Ask a Doubt" />
          <NavItem to="/quiz" icon={BrainCircuit} label="Take Quiz" />
          <NavItem to="/flashcards" icon={FileText} label="Flashcards" />
          <NavItem to="/plan" icon={Calendar} label="Study Plan" />
          <NavItem to="/uploads" icon={Upload} label="Uploads" />
          <NavItem to="/settings" icon={Settings} label="Settings" />
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 mt-14 md:mt-0 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};
