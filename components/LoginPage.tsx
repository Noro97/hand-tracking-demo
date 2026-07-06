import type { FC, FormEvent } from 'react';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { LogIn, UserPlus } from 'lucide-react';

import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';

type Mode = 'sign-in' | 'sign-up';

const LoginPage: FC = () => {
  const { session, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!authLoading && session) return <Navigate to="/" replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);

    const { error: authError } =
      mode === 'sign-in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setSubmitting(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    if (mode === 'sign-up') setNotice('Account created — check your email if confirmation is required, then sign in.');
  };

  return (
    <div className="flex w-full h-screen bg-page text-text-primary items-center justify-center font-roboto">
      <form
        onSubmit={handleSubmit}
        className="bg-surface p-8 rounded-[24px] border border-border shadow-2xl w-full max-w-sm flex flex-col gap-4"
      >
        <h1 className="text-xl font-bold">Clinician {mode === 'sign-in' ? 'sign in' : 'sign up'}</h1>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-text-muted">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-border/20 border border-border rounded-lg px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-text-muted">Password</span>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-border/20 border border-border rounded-lg px-3 py-2"
          />
        </label>

        {error && <p className="text-sm text-accent-red">{error}</p>}
        {notice && <p className="text-sm text-accent-green">{notice}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="flex items-center justify-center gap-2 bg-accent-green/20 border border-accent-green text-accent-green rounded-xl px-3 py-2 text-sm font-medium disabled:opacity-50"
        >
          {mode === 'sign-in' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
          {mode === 'sign-in' ? 'Sign in' : 'Create account'}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
            setError(null);
            setNotice(null);
          }}
          className="text-sm text-text-muted underline"
        >
          {mode === 'sign-in' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </form>
    </div>
  );
};

export default LoginPage;
