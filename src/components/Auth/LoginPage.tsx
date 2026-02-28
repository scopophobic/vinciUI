import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Check your email for the confirmation link.' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message ?? 'Something went wrong' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
      if (error) throw error;
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message ?? 'Google sign-in failed' });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-mono relative overflow-hidden">
      <div
        className="fixed inset-0 z-0"
        style={{
          background:
            'rgb(255, 255, 255) radial-gradient(circle at 1px 1px, rgba(0, 0, 0, 0.15) 1px, transparent 0px) 0% 0% / 20px 20px',
        }}
      />
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-8">
        <div className="text-center mb-8">
          <h1 className="text-6xl md:text-8xl font-bold text-black mb-4 tracking-tight">
            VINCI<span className="text-gray-600">UI</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 mb-2 tracking-wide">
            NODE-BASED IMAGE GENERATION
          </p>
          <p className="text-sm md:text-base text-gray-500 max-w-md mx-auto leading-relaxed">
            Sign in to start creating stunning AI-generated images with our intuitive visual workflow.
          </p>
        </div>

        <div
          className="bg-white border border-gray-200 shadow-lg rounded-lg p-8 w-full max-w-md"
          style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05)' }}
        >
          <h2 className="text-xl font-bold text-black mb-4 uppercase tracking-wide">
            {isSignUp ? 'Create account' : 'Welcome back'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1 uppercase tracking-wide">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-200 text-sm font-mono focus:outline-none focus:border-black"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1 uppercase tracking-wide">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 border border-gray-200 text-sm font-mono focus:outline-none focus:border-black"
                placeholder="••••••••"
              />
            </div>
            {message && (
              <div
                className={`text-sm ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}
              >
                {message.text}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2.5 bg-black text-white text-sm font-mono uppercase tracking-wide hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Please wait...' : isSignUp ? 'Sign up' : 'Sign in'}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 bg-white text-gray-700 text-sm font-mono hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>
          </div>

          <p className="mt-4 text-xs text-gray-500 text-center">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setMessage(null); }}
              className="text-black underline hover:no-underline"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide">
            Secure authentication • Privacy protected • No spam
          </p>
        </div>
      </div>
    </div>
  );
}
