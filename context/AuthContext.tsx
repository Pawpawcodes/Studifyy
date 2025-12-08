import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../supabaseClientFrontend';

interface AuthContextType {
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  googleSignIn: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial session fetch
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) console.error('Error getting session:', error);
      setSession(data.session);
      setLoading(false);
    });

    // Auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const googleSignIn = async () => {
    /**
     * FUTURE-PROOF REDIRECT
     * Works regardless of:
     *  - New Netlify project
     *  - Domain changes
     *  - Localhost vs Production
     * 
     * HashRouter requires "/#/login"
     */
    const redirectTo = `${window.location.origin}/#/login`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });

    if (error) console.error('Google Sign-in Error:', error);
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Sign-out error:', error);
  };

  return (
    <AuthContext.Provider value={{ session, loading, signOut, googleSignIn }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
