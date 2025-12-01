import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClientFrontend';

export function AuthBar() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
    if (error) console.error(error);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  if (!user) {
    return (
      <button 
        onClick={signInWithGoogle} 
        className="px-4 py-2 rounded-lg bg-blue-600 text-white"
      >
        Sign in with Google
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm">
        Hi, {user.user_metadata?.full_name || user.email}
      </span>
      <button 
        onClick={signOut} 
        className="px-3 py-1 rounded-lg border"
      >
        Logout
      </button>
    </div>
  );
}
