
import React, { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Brain } from "lucide-react";

const Login: React.FC = () => {
  const { googleSignIn, session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (session) {
      navigate("/");
    }
  }, [session, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6 text-white">
          <Brain size={40} />
        </div>
        
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome to Studify</h1>
        <p className="text-slate-500 mb-8">Sign in to sync your progress, quizzes, and notes across devices.</p>
        
        <button
          onClick={googleSignIn}
          className="w-full bg-white text-slate-700 border border-slate-300 px-6 py-4 rounded-xl font-bold text-lg hover:bg-slate-50 transition-all flex items-center justify-center shadow-sm hover:shadow-md"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-6 h-6 mr-3" alt="Google" />
          Continue with Google
        </button>
        
        <div className="mt-8 text-xs text-slate-400">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </div>
      </div>
      
      <div className="mt-8">
        <button onClick={() => navigate("/landing")} className="text-primary font-medium flex items-center hover:underline">
           Back to Home <ArrowRight size={16} className="ml-1" />
        </button>
      </div>
    </div>
  );
};

export default Login;
